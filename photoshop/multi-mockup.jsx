$.evalFile(Folder.temp + "/multi-mockup.env");

var imageFiles = MOCKUP_INPUTS;
var mockupFile = MOCKUP_FILE;

var mockupDoc = app.open(new File(mockupFile));

function MoveLayerTo(fLayer, fX, fY) {
  var Position = fLayer.bounds;
  Position[0] = fX - Position[0];
  Position[1] = fY - Position[1];

  fLayer.translate(-Position[0], -Position[1]);
}

function setLayerImage(targetLayer) {
  var imageFile = imageFiles[targetLayer.name];
  if (!imageFile) return;
  var imageDoc = app.open(new File(imageFile));
  imageDoc.selection.selectAll();
  imageDoc.selection.copy();
  imageDoc.close(SaveOptions.DONOTSAVECHANGES);

  mockupDoc.activeLayer = targetLayer;
  app.runMenuItem(stringIDToTypeID("placedLayerEditContents"));

  var contentDoc = activeDocument;
  var fullBounds = contentDoc.activeLayer.bounds;
  var fullWidth = fullBounds[2] - fullBounds[0];
  var fullHeight = fullBounds[3] - fullBounds[1];

  contentDoc.paste();

  var contentLayer = contentDoc.activeLayer;
  MoveLayerTo(contentLayer, 0, 0);

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
}

var layers = mockupDoc.layers;
for (var i = 0; i < layers.length; i++) {
  var layer = layers[i];
  if (
    layer.name.indexOf("graphic") >= 0 &&
    layer.kind === LayerKind.SMARTOBJECT
  ) {
    setLayerImage(layer);
  }
}
