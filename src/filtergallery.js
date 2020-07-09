var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {
    antialiasing: true,
    view: document.getElementById("stage")
});

var stage = new PIXI.Stage(0x000000, true);

var image = new PIXI.Sprite.fromImage("wall.jpg");
image.anchor.x = .5;
image.anchor.y = .5;

// image's dimensions, useful for resize event
var dimensions = {
    x: 1902,
    y: 1070
}


stage.addChild(image);

var logo = PIXI.Sprite.fromImage("logo_small.png")
stage.addChild(logo);

logo.anchor.x = 1;
logo.anchor.y = 1;

logo.position.x = 630
logo.scale.x = logo.scale.y = 0.5;
logo.position.y = 400;
logo.interactive = true;
logo.buttonMode = true;
logo.click = logo.tap = function () {
    window.open("https://github.com/GoodBoyDigital/pixi.js", "_blank")
}

var colorMatrix = new PIXI.filters.ColorMatrixFilter();
image.filters = [colorMatrix];


// all filters are desactivate
var colorMatrixMethods = [];
for (var i = 0; i < 19; i++) {
    colorMatrixMethods.push(false);
};

// params to play with Dat GUI
var params = {
    photo: "Cute Kitten",
    saturation: 0,
    rotation: 0,
    brightness: 1,
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
const wrapFunction = function (fn, context, params) {
    return function () {
        fn.apply(context, params);
    }
}

var methods = [];

function adaptFilters() {
    // reset the color matrix
    colorMatrix.reset();

    // set new values in array each time to take new params value
    // use wrapFunction() method to store function with paramaters and use them in for loop
    methods = [
        wrapFunction(colorMatrix.saturation, colorMatrix, [params.saturation, true]),
        wrapFunction(colorMatrix.hue, colorMatrix, [params.rotation, true]),
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
        // if the method is checked in DAT gui
        if (colorMatrixMethods[i]) {
            methods[i]();
        }
    };
};

// render
function animate() {
    var ratio = Math.min(window.innerWidth / dimensions.x, window.innerHeight / dimensions.y);

    renderer.render(stage);
    requestAnimationFrame(animate);
};

animate();

// resize
var w, h;
window.onresize = resize;

function resize(event) {
    w = window.innerWidth;
    h = window.innerHeight;

    var ratio = Math.max(w / dimensions.x, h / dimensions.y);

    image.width = dimensions.x * ratio;
    image.height = dimensions.y * ratio;

    image.position.x = w * 0.5;
    image.position.y = h * 0.5;

    logo.x = w;
    logo.y = h - 20;
}

resize();


/*
 * DAT GUI
 */

var gui = new dat.GUI({});

var changePhoto = gui.add(params, 'photo', ['Wall', 'Cute kitten', 'Goodboys', 'Car']).onChange(function (value) {
    if (value === 'Wall') {
        image.texture = new PIXI.Texture.fromImage("wall.jpg");
    } else if (value === 'Cute kitten') {
        image.texture = new PIXI.Texture.fromImage("cats.jpg");
    } else if (value === 'Goodboys') {
        image.texture = new PIXI.Texture.fromImage("goodboys.jpg");
    } else if (value === 'Car') {
        image.texture = new PIXI.Texture.fromImage("Cali.jpg");
    }
});

var saturation = gui.addFolder('saturation');
saturation.add(colorMatrixMethods, '0').name("apply").onChange(adaptFilters);
saturation.add(params, 'saturation', -1, 10).name("intensity").onChange(adaptFilters);

var hue = gui.addFolder('hue');
hue.add(colorMatrixMethods, '1').name("apply").onChange(adaptFilters);
hue.add(params, 'rotation', 0, 360).name("rotation").onChange(adaptFilters);

var brightness = gui.addFolder('brightness');
brightness.add(colorMatrixMethods, '3').name("apply").onChange(adaptFilters);
brightness.add(params, 'brightness', 0, 15).name("intensity").onChange(adaptFilters);

var contrast = gui.addFolder('contrast');
contrast.add(colorMatrixMethods, '4').name("apply").onChange(adaptFilters);
contrast.add(params, 'contrast', 0, 15).name("intensity").onChange(adaptFilters);

var desaturate = gui.addFolder('desaturate');
desaturate.add(colorMatrixMethods, '5').name("apply").onChange(adaptFilters);

var technicolor = gui.addFolder('technicolor');
technicolor.add(colorMatrixMethods, '6').name("apply").onChange(adaptFilters);

var grey = gui.addFolder('grey');
grey.add(colorMatrixMethods, '7').name("apply").onChange(adaptFilters);
grey.add(params, 'grey', 0, 1).name("intensity").onChange(adaptFilters);

var polaroid = gui.addFolder('polaroid');
polaroid.add(colorMatrixMethods, '8').name("apply").onChange(adaptFilters);

var vintage = gui.addFolder('vintage');
vintage.add(colorMatrixMethods, '9').name("apply").onChange(adaptFilters);

var kodachrome = gui.addFolder('kodachrome');
kodachrome.add(colorMatrixMethods, '10').name("apply").onChange(adaptFilters);

var toBGR = gui.addFolder('toBGR');
toBGR.add(colorMatrixMethods, '11').name("apply").onChange(adaptFilters);

var sepia = gui.addFolder('sepia');
sepia.add(colorMatrixMethods, '12').name("apply").onChange(adaptFilters);

var negative = gui.addFolder('negative');
negative.add(colorMatrixMethods, '13').name("apply").onChange(adaptFilters);

var bAndW = gui.addFolder('bAndW');
bAndW.add(colorMatrixMethods, '14').name("apply").onChange(adaptFilters);

var night = gui.addFolder('night');
night.add(colorMatrixMethods, '15').name("apply").onChange(adaptFilters);
night.add(params, 'night', 0, 1).name("intensity").onChange(adaptFilters);

var predator = gui.addFolder('predator');
predator.add(colorMatrixMethods, '16').name("apply").onChange(adaptFilters);
predator.add(params, 'predator', 0.2, 1).name("intensity").onChange(adaptFilters);

var browni = gui.addFolder('browni');
browni.add(colorMatrixMethods, '17').name("apply").onChange(adaptFilters);

var lsd = gui.addFolder('lsd');
lsd.add(colorMatrixMethods, '18').name("apply").onChange(adaptFilters);

var colorTone = gui.addFolder('colorTone');
colorTone.add(colorMatrixMethods, '2').name("apply").onChange(adaptFilters);
colorTone.add(params.colorTone, 'desaturation', 0, 5).name("desaturation").onChange(adaptFilters);
colorTone.add(params.colorTone, 'toned', 0, 1).name("toned").onChange(adaptFilters);
colorTone.addColor(params.colorTone, 'lightColor').name("lightColor").onChange(function (value) {
    params.colorTone.lightColor = "0x" + value.substring(1);
    adaptFilters();
});
colorTone.addColor(params.colorTone, 'darkColor').name("darkColor").onChange(function (value) {
    params.colorTone.darkColor = "0x" + value.substring(1);
    adaptFilters();
});