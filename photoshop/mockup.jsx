$.evalFile(Folder.temp + "/mockup.env");

var imageFile = MOCKUP_INPUT;
var mockupFile = MOCKUP_FILE;

var imageDoc = app.open(new File(imageFile));
imageDoc.selection.selectAll();
imageDoc.selection.copy();
imageDoc.close(SaveOptions.DONOTSAVECHANGES);

var mockupDoc = app.open(new File(mockupFile));

function findLayer(layers, matcher) {
  for (var i = 0; i < layers.length; i++) {
    if (matcher(layers[i])) return layers[i];
  }
  return undefined;
}

const matchers = [
  function (layer) {
    return layer.name === "mockup" && layer.kind === LayerKind.SMARTOBJECT;
  },
  function (layer) {
    return layer.name === "graphic" && layer.kind === LayerKind.SMARTOBJECT;
  },
  function (layer) {
    return layer.kind === LayerKind.SMARTOBJECT;
  },
];

function findGraphicLayer(layers) {
  for (var i = 0; i < matchers.length; i++) {
    var found = findLayer(layers, matchers[i]);
    if (found) return found;
  }
  return undefined;
}

var targetLayer = findGraphicLayer(mockupDoc.layers);
mockupDoc.activeLayer = targetLayer;

app.runMenuItem(stringIDToTypeID("placedLayerEditContents"));

var contentDoc = activeDocument;
var fullBounds = contentDoc.activeLayer.bounds;
var fullWidth = fullBounds[2] - fullBounds[0];
var fullHeight = fullBounds[3] - fullBounds[1];

contentDoc.paste();

function MoveLayerTo(fLayer, fX, fY) {
  var Position = fLayer.bounds;
  Position[0] = fX - Position[0];
  Position[1] = fY - Position[1];

  fLayer.translate(-Position[0], -Position[1]);
}

var contentLayer = contentDoc.activeLayer;
MoveLayerTo(contentLayer, 0, 0);

var imageBounds = contentLayer.bounds;
var imageWidth = imageBounds[2] - imageBounds[0];
var imageHeight = imageBounds[3] - imageBounds[1];

contentLayer.resize(
  (100 * fullWidth) / imageWidth,
  (100 * fullHeight) / imageHeight,
  AnchorPosition.TOPLEFT
);

contentDoc.save();
contentDoc.close();

// SAVING DONE IN DROPLET

// var pngOpts = new PNGSaveOptions();

// pngOpts.compression = 9;

// pngOpts.interlaced = false;
// mockupDoc.saveAs(new File(outputFile), pngOpts, true, Extension.LOWERCASE);
// mockupDoc.close(SaveOptions.DONOTSAVECHANGES);
