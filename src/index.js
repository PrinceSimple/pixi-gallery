import * as PIXI from 'pixi.js'

const backgroundFragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 uPointerDiff;
float isGridLine (vec2 coord) {
  vec2 pixelsPerGrid = vec2(40.0, 40.0);
  vec2 gridCoords = fract(coord / pixelsPerGrid);
  vec2 gridPixelCoords = gridCoords * pixelsPerGrid;
  vec2 gridLine = step(gridPixelCoords, vec2(1.0));
  float isGridLine = max(gridLine.x, gridLine.y);
  return isGridLine;
}

void main () {
  vec2 coord = gl_FragCoord.xy - uPointerDiff + vec2(10.0);
  vec3 color = vec3(0.0);
  color.b = isGridLine(coord) * 0.2;
  color.g = isGridLine(coord) * 0.1;
  gl_FragColor = vec4(color, 1.0);
}`
const stageFragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

// Uniforms from Javascript
uniform vec2 uResolution;
uniform float uPointerDown;

// The texture is defined by PixiJS
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

// Function used to get the distortion effect
vec2 computeUV (vec2 uv, float k, float kcube) {
  vec2 t = uv - 0.5;
  float r2 = t.x * t.x + t.y * t.y;
  float f = 0.0;
  if (kcube == 0.0) {
    f = 1.0 + r2 * k;
  } else {
    f = 1.0 + r2 * (k + kcube * sqrt(r2));
  }
  vec2 nUv = f * t + 0.5;
  nUv.y = 1.0 - nUv.y;
  return nUv;
}

void main () {

  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float k = -1.0 * uPointerDown;
  float kcube = 0.5 * uPointerDown;
  float offset = 0.02 * uPointerDown;

  float red = texture2D(uSampler, computeUV(uv, k + offset, kcube)).r;
  float green = texture2D(uSampler, computeUV(uv, k, kcube)).g;
  float blue = texture2D(uSampler, computeUV(uv, k - offset, kcube)).b;
  
  gl_FragColor = vec4(red, green, blue, 1.0);
}`
// Class to generate a random masonry layout, using a square grid as base
class Grid {

  // The constructor receives all the following parameters:
  // - gridSize: The size (width and height) for smallest unit size
  // - gridColumns: Number of columns for the grid (width = gridColumns * gridSize)
  // - gridRows: Number of rows for the grid (height = gridRows * gridSize)
  // - gridMin: Min width and height limits for rectangles (in grid units)
  constructor(gridSize, gridColumns, gridRows, gridMin) {
    this.gridSize = gridSize
    this.gridColumns = gridColumns
    this.gridRows = gridRows
    this.gridMin = gridMin
    this.rects = []
    this.currentRects = [{
      x: 0,
      y: 0,
      w: this.gridColumns,
      h: this.gridRows
    }]
  }

  // Takes the first rectangle on the list, and divides it in 2 more rectangles if possible
  splitCurrentRect() {
    if (this.currentRects.length) {
      const currentRect = this.currentRects.shift()
      const cutVertical = currentRect.w > currentRect.h
      const cutSide = cutVertical ? currentRect.w : currentRect.h
      const cutSize = cutVertical ? 'w' : 'h'
      const cutAxis = cutVertical ? 'x' : 'y'
      if (cutSide > this.gridMin * 2) {
        const rect1Size = randomInRange(this.gridMin, cutSide - this.gridMin)
        const rect1 = Object.assign({}, currentRect, {
          [cutSize]: rect1Size
        })
        const rect2 = Object.assign({}, currentRect, {
          [cutAxis]: currentRect[cutAxis] + rect1Size,
          [cutSize]: currentRect[cutSize] - rect1Size
        })
        this.currentRects.push(rect1, rect2)
      } else {
        this.rects.push(currentRect)
        this.splitCurrentRect()
      }
    }
  }

  // Call `splitCurrentRect` until there is no more rectangles on the list
  // Then return the list of rectangles
  generateRects() {
    while (this.currentRects.length) {
      this.splitCurrentRect()
    }
    return this.rects
  }
}

// Generate a random integer in the range provided
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Get canvas view
const view = document.querySelector('.view')

let pointerDownTarget = false
let pointerDownDetail = false
let detailShown = false
let detailView = new PIXI.Container()
let pointerStart = new PIXI.Point()
let pointerDiffStart = new PIXI.Point()
let width, height, app, background, uniforms, diffX, diffY


// grid settings
const gridSize = 50
const gridMin = 3
const imagePadding = 20
let gridColumnsCount, gridRowsCount, gridColumns, gridRows, grid
let widthRest, heightRest, centerX, centerY, container, rects
let detailImage, images, imagesUrls

// dimensions
function initDimensions() {
  width = window.innerWidth
  height = window.innerHeight
  diffX = 0
  diffY = 0
}

// Set uniforms for shader
function initUniforms() {
  uniforms = {
    uResolution: new PIXI.Point(width, height),
    uPointerDiff: new PIXI.Point(),
    uPointerDown: pointerDownTarget
  }
}

// Initialize the random grid layout
function initGrid() {
  gridColumnsCount = Math.ceil(width / gridSize)
  gridRowsCount = Math.ceil(height / gridSize)
  gridColumns = gridColumnsCount * 5
  gridRows = gridRowsCount * 5
  grid = new Grid(gridSize, gridColumns, gridRows, gridMin)
  widthRest = Math.ceil(gridColumnsCount * gridSize - width)
  heightRest = Math.ceil(gridRowsCount * gridSize - height)
  centerX = (gridColumns * gridSize / 2) - (gridColumnsCount * gridSize / 2)
  centerY = (gridRows * gridSize / 2) - (gridRowsCount * gridSize / 2)
  rects = grid.generateRects()
  images = []
  imagesUrls = {}
}

// Init the PixiJS Application
function initApp() {
  // Create PixiJS Application, using the view (canvas) provided
  app = new PIXI.Application({
    view
  })
  app.renderer.autoDensity = true
  app.renderer.resize(width, height)
  const stageFilter = new PIXI.Filter(null, stageFragmentShader, uniforms)
  app.stage.filters = [stageFilter]
}

// Init the gridded background
function initBackground() {
  // Create a new empty Sprite and define its size
  background = new PIXI.Sprite()
  background.width = width
  background.height = height
  // Get the code for the fragment shader from the loaded resources
  // Create a new Filter using the fragment shader
  // We don't need a custom vertex shader, so we set it as `undefined`
  const backgroundFilter = new PIXI.Filter(null, backgroundFragmentShader, uniforms)
  // Assign the filter to the background Sprite
  background.filters = [backgroundFilter]
  // Add the background to the stage
  app.stage.addChild(background)
}

// Initialize a Container element for solid rectangles and images
function initContainer() {
  container = new PIXI.Container()
  app.stage.addChild(container)
}

// Load texture for an image, giving its index
function loadTextureForImage(index) {
  // Get image Sprite
  const image = images[index]
  // Set the url to get a random image from Unsplash Source, given image dimensions
  const url = `https://source.unsplash.com/random/${image.width}x${image.height}`
  // Get the corresponding rect, to store more data needed (it is a normal Object)
  const rect = rects[index]
  // Create a new AbortController, to abort fetch if needed
  const {
    signal
  } = rect.controller = new AbortController()
  // Fetch the image
  fetch(url, {
    signal
  }).then(response => {
    // Get image URL, and if it was downloaded before, load another image
    // Otherwise, save image URL and set the texture
    const id = response.url.split('?')[0]
    if (imagesUrls[id]) {
      loadTextureForImage(index)
    } else {
      imagesUrls[id] = true
      image.texture = PIXI.Texture.from(response.url)
      rect.loaded = true
    }
  }).catch(() => {
    // Catch errors silently, for not showing the following error message if it is aborted:
    // AbortError: The operation was aborted.
  })
}

// Add solid rectangles and images
function initRectsAndImages() {
  // Create a new Graphics element to draw solid rectangles
  const graphics = new PIXI.Graphics()
  // Select the color for rectangles
  graphics.beginFill(0x080808)
  // Loop over each rect in the list
  rects.forEach(rect => {
    // Create a new Sprite element for each image
    const image = new PIXI.Sprite()
    // Set image's position and size
    image.x = rect.x * gridSize
    image.y = rect.y * gridSize
    image.width = rect.w * gridSize - imagePadding
    image.height = rect.h * gridSize - imagePadding
    image.interactive = true
    image.buttonMode = true
    image.on('pointertap', onPointerTap)

    // Set it's alpha to 0, so it is not visible initially
    image.alpha = 0
    // Add image to the list
    images.push(image)
    // Draw the rectangle
    graphics.drawRoundedRect(image.x, image.y, image.width, image.height, 5)
  })
  // Ends the fill action
  graphics.endFill()
  // Add the graphics (with all drawn rects) to the container
  container.addChild(graphics)
  // Add all image's Sprites to the container
  images.forEach(image => {
    container.addChild(image)
  })
}

// Start events
function initEvents() {
  app.stage.interactive = true
  app.stage
    .on('pointerdown', onPointerDown)
    .on('pointerup', onPointerUp)
    .on('pointerupoutside', onPointerUp)
    .on('pointermove', onPointerMove)
}

// Check if rects intersects with the viewport
// and loads corresponding image
function checkRectsAndImages() {
  if (detailShown && detailView.alpha < 1) {
    detailView.alpha += 0.01
  }
  // Loop over rects
  rects.forEach((rect, index) => {
    // Get corresponding image
    const image = images[index]
    // Check if the rect intersects with the viewport
    if (rectIntersectsWithViewport(rect)) {
      // If rect just has been discovered
      // start loading image
      if (!rect.discovered) {
        rect.discovered = true
        loadTextureForImage(index)
      }
      // If image is loaded, increase alpha if possible
      if (rect.loaded && image.alpha < 1) {
        image.alpha += 0.01
      }
    } else { // The rect is not intersecting
      // If the rect was discovered before, but the
      // image is not loaded yet, abort the fetch
      if (rect.discovered && !rect.loaded) {
        rect.discovered = false
        rect.controller.abort()
      }
      // Decrease alpha if possible
      if (image.alpha > 0) {
        image.alpha -= 0.01
      }
    }
  })
}

// detail image menu
const detailMenu = document.querySelector('#detailMenu')
const saturation = document.querySelector('#satSlider')
saturation.addEventListener('change', () => {
  params.saturation = saturation.value;
  adaptFilters()
})
const brightness = document.querySelector('#brSlider')
brightness.addEventListener('change', () => {
  params.brightness = brightness.value;
  adaptFilters()
})
const hue = document.querySelector('#hueSlider')
hue.addEventListener('change', () => {
  params.hue = hue.value;
  adaptFilters()
})
const contrast = document.querySelector('#ctSlider')
contrast.addEventListener('change', () => {
  params.contrast = contrast.value;
  adaptFilters()
})
const technicolor = document.querySelector('#technicolor')
technicolor.addEventListener('change', () => {
  colorMatrixMethods[5] = technicolor.checked;
  adaptFilters()
})
const polaroid = document.querySelector('#polaroid')
polaroid.addEventListener('change', () => {
  colorMatrixMethods[7] = polaroid.checked;
  adaptFilters()
})
const vintage = document.querySelector('#vintage')
vintage.addEventListener('change', () => {
  colorMatrixMethods[8] = vintage.checked;
  adaptFilters()
})
const kodachrome = document.querySelector('#kodachrome')
kodachrome.addEventListener('change', () => {
  colorMatrixMethods[9] = kodachrome.checked;
  adaptFilters()
})
const sepia = document.querySelector('#sepia')
sepia.addEventListener('change', () => {
  colorMatrixMethods[11] = sepia.checked;
  adaptFilters()
})
const greyscale = document.querySelector('#greyscale')
greyscale.addEventListener('change', () => {
  colorMatrixMethods[6] = greyscale.checked;
  adaptFilters()
})

let colorMatrix = new PIXI.filters.ColorMatrixFilter()
var colorMatrixMethods = [true, true, true, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];

let params = {
  saturation: 0,
  brightness: 1,
  hue: 0,
  contrast: 0,
  grey: .5,
  night: .5,
  predator: .5,
  colorTone: {
    desaturation: .2,
    toned: .15,
    lightColor: "#FFFFFF",
    darkColor: "#000000"
  }
}
// function wrapper to store function with parameters in an array (-> methods[])
const wrapFunction = (fn, context, params) => {
  return () => {
    fn.apply(context, params);
  }
}

let methods = []

function adaptFilters() {
  // reset the color matrix
  colorMatrix.reset();
  // set new values in array each time to take new params value
  // use wrapFunction() method to store function with paramaters and use them in for loop
  methods = [
    wrapFunction(colorMatrix.saturate, colorMatrix, [params.saturation, true]),
    wrapFunction(colorMatrix.hue, colorMatrix, [params.hue, true]),
    wrapFunction(colorMatrix.brightness, colorMatrix, [params.brightness, true]),
    wrapFunction(colorMatrix.contrast, colorMatrix, [params.contrast, true]),
    wrapFunction(colorMatrix.desaturate, colorMatrix, [true]),
    wrapFunction(colorMatrix.technicolor, colorMatrix, [true]),
    wrapFunction(colorMatrix.greyscale, colorMatrix, [params.grey, true]),
    wrapFunction(colorMatrix.polaroid, colorMatrix, [true]),
    wrapFunction(colorMatrix.vintage, colorMatrix, [true]),
    wrapFunction(colorMatrix.kodachrome, colorMatrix, [true]),
    wrapFunction(colorMatrix.toBGR, colorMatrix, [true]),
    wrapFunction(colorMatrix.sepia, colorMatrix, [true]),
    wrapFunction(colorMatrix.negative, colorMatrix, [true]),
    wrapFunction(colorMatrix.blackAndWhite, colorMatrix, [true]),
    wrapFunction(colorMatrix.night, colorMatrix, [params.night, true]),
    wrapFunction(colorMatrix.predator, colorMatrix, [params.predator, true]),
    wrapFunction(colorMatrix.browni, colorMatrix, [true]),
    wrapFunction(colorMatrix.lsd, colorMatrix, [true]),
    wrapFunction(colorMatrix.colorTone, colorMatrix, [params.colorTone.desaturation, params.colorTone.toned, params.colorTone.lightColor, params.colorTone.darkColor, true])
  ];

  // loop through the colormatrix methods
  for (var i = 0; i < colorMatrixMethods.length; i++) {
    // if the method is checked in HTML-GUI
    if (colorMatrixMethods[i]) {
      methods[i]();
    }
  }
}

function showDetailImage(url) {
  detailImage = new PIXI.Sprite.from(url)
  detailImage.texture.baseTexture.on('loaded', buildDetailView)
}

function buildDetailView() {
  const frame = new PIXI.Graphics()
  let close = new PIXI.Text('close [X]', {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fill: 0xcccccc,
    align: 'center'
  })
  let download = new PIXI.Text('download image', {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fill: 0xcccccc,
    align: 'center'
  })
  detailView.setTransform(window.innerWidth / 2 - detailImage.width / 2 - imagePadding, window.innerHeight / 2 - detailImage.height / 2 - imagePadding)
  frame.beginFill(0x080808)
  frame.drawRoundedRect(-20, -20, detailImage.width + 40, detailImage.height + 40, 10)
  frame.endFill()
  close.anchor.set(0.5, 0.5)
  close.position.set(detailImage.width / 2, detailImage.height + 10)
  download.anchor.set(0.5, 0.5)
  download.position.set(50, detailImage.height + 10)
  detailShown = true
  detailView.removeChildren()
  detailView.addChild(frame)
  detailView.addChild(close)
  detailView.addChild(download)
  detailView.addChild(detailImage)
  detailImage.interactive = true
  detailImage.on('pointermove', onPointerMove)
  detailView.alpha = 0
  app.stage.children[1].filters = [new PIXI.filters.BlurFilter()]
  app.stage.children[1].interactiveChildren = false
  app.stage.interactive = false
  close.interactive = true
  close.on('pointerdown', onDetailClose)
  download.interactive = true
  download.on('pointerdown', onDownloadImage) //downloadImage(detailImage, 'image_pixi_gallery.png'))
  //let colorMatrix = new PIXI.filters.ColorMatrixFilter()
  detailImage.filters = [colorMatrix]
  app.stage.addChild(detailView)
}

function rectIntersectsWithViewport(rect) {
  return (
    rect.x * gridSize + container.x <= width &&
    0 <= (rect.x + rect.w) * gridSize + container.x &&
    rect.y * gridSize + container.y <= height &&
    0 <= (rect.y + rect.h) * gridSize + container.y
  )
}

function onDownloadImage(e) {
  const fileName = 'image.png'
  const temp = new PIXI.Container()
  temp.addChild(detailImage)
  app.renderer.extract.canvas(temp).toBlob((b) => {
    var a = document.createElement('a')
    document.body.append(a)
    a.download = fileName
    a.href = URL.createObjectURL(b)
    a.click()
    a.remove()
  }, 'image/png')
  detailView.addChild(detailImage)
  temp.destroy()
}

function onDetailClose() {
  app.stage.children[1].filters = null
  app.stage.children[1].interactiveChildren = true
  app.stage.interactive = true
  app.stage.removeChild(detailView)
  detailImage.texture.baseTexture.destroy()
  detailImage.texture.destroy()
  technicolor.checked = false
  kodachrome.checked = false
  polaroid.checked = false
  sepia.checked = false
  greyscale.checked = false
  vintage.checked = false
  detailMenu.style.display = 'none'
  detailShown = false
}

function onPointerDown(e) {
  const {
    x,
    y
  } = e.data.global
  pointerDownTarget = true
  pointerDownDetail = true
  pointerStart.set(x, y)
  pointerDiffStart = uniforms.uPointerDiff.clone()
}

function onPointerUp() {
  pointerDownTarget = false
}

function onPointerTap(e) {
  if (pointerDownDetail) {
    if (e.target._texture.textureCacheIds[0] != undefined) {
      const url = e.target._texture.textureCacheIds[0].split('?')[0] + `?fm=jpg&w=${width - 200}&h=${height - 200}`
      showDetailImage(url)
      detailMenu.style.display = 'block'
      //detailShown = true
    }
  }
}

function onPointerMove(e) {
  pointerDownDetail = false
  const {
    x,
    y
  } = e.data.global

  if (pointerDownTarget) {
    diffX = pointerDiffStart.x + (x - pointerStart.x)
    diffY = pointerDiffStart.y + (y - pointerStart.y)
    diffX = diffX > 0 ? Math.min(diffX, centerX + imagePadding) : Math.max(diffX, -(centerX + widthRest))
    diffY = diffY > 0 ? Math.min(diffY, centerY + imagePadding) : Math.max(diffY, -(centerY + heightRest))
  }
}

// Init everything
function init() {
  initDimensions()
  initUniforms()
  initGrid()
  initApp()
  initBackground()
  initContainer()
  initRectsAndImages()
  initEvents()

  // Animation loop
  app.ticker.add(() => {
    // coefficient for smooth animation
    uniforms.uPointerDown += (pointerDownTarget - uniforms.uPointerDown) * 0.12
    uniforms.uPointerDiff.x += (diffX - uniforms.uPointerDiff.x) * 0.2
    uniforms.uPointerDiff.y += (diffY - uniforms.uPointerDiff.y) * 0.2
    container.x = uniforms.uPointerDiff.x - centerX
    container.y = uniforms.uPointerDiff.y - centerY
    checkRectsAndImages()
  })
}

// Init the app
init()