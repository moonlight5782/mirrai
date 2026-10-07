import { ModelViewerElement } from "@google/model-viewer";
// Configure before Home mounts a model-viewer element (and before GLB decoding).
ModelViewerElement.dracoDecoderLocation = "/draco/";
export { default } from "../app/page";
