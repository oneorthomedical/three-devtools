export default (() => {

const isDevtoolsSerialization = meta => !!(meta && meta.devtoolsConfig);
const tempPosition = new THREE.Vector3();
const tempRotation = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempEuler = new THREE.Euler();

return function InstrumentedToJSON (meta) {
/**
 * The instrumented version of entity's `toJSON` method,
 * used to patch because:
 * 1) entity does not have toJSON method
 * 2) current serialization returns insufficient information
 * 3) throws an error on serialization
 *
 * Additionally, this makes it possible to create
 * instrumentation-only options that can be attached
 * to the `meta` object, like smarter serialization of images.
 */

  const toJSON = this.constructor &&
                 this.constructor.prototype &&
                 this.constructor.prototype.toJSON;

  // Short circuit if this is something other than the devtools
  // serializing.
  if (!isDevtoolsSerialization(meta)) {
    return toJSON.apply(this, arguments);
  }

  // Store our custom flags that are passed in via
  // the resources.
  const serializeChildren = meta.devtoolsConfig.serializeChildren === false ? false : true;

  // First, discover the `baseType`, which for most
  // entities in three.js core, this is the same as
  // `type` -- however the `type` property can be modified
  // by a developer, especially common when extending a
  // base class.
  // Note, be sure to check subclasses before
  // base classes here.
  const baseType = utils.getBaseType(this);

  let textureData;
  if (this.isTexture) {
    // If `image` is a plain object, probably from DataTexture
    // or a texture from a render target, hide it during serialization
    // so an attempt to turn it into a data URL doesn't throw.
    // Patch for DataTexture.toJSON (https://github.com/mrdoob/three.js/pull/17745)
    if (Object.prototype.toString.call(this.image) === '[object Object]') {
      textureData = this.image;
      this.image = undefined;
    }
  }
  

  let children;
  if (this.isObject3D && !serializeChildren) {
    // Swap out the children array before serialization if
    // it's to be avoided.
    children = this.children;
    this.children = [];
  }

  // Call the original serialization method.
  // Note that this can fail if the toJSON was manually
  // overwritten e.g. not a part of a prototype. Check for its existence
  // first since some do not have any toJSON method,
  // like WebGLRenderTarget
  let data = toJSON ? toJSON.apply(this, arguments) : {};

  // If an image was hidden to avoid serialization,
  // reapply it here
  if (textureData) {
    this.image = textureData;
  }
  // Reattach children
  if (children) {
    this.children = children;
  }

  // Parametric geometry cannot be rehydrated
  // without introducing a vector for code injection.
  // For serialization, stringifying is fine,
  // but this geometry is unrehydratable (for good reason,
  // as this would then get access to privileged extension code).
  // https://github.com/mrdoob/three.js/issues/17381
  else if (data.func) {
    data.func = this.parameters.func ?
                this.parameters.func.toString() : '';
  }
  // Render targets shouldn't be in the graph directly
  // since their textures must be used instead, but this
  // may still occur in `scene.background`, where an attempt
  // at serialization occurs and breaks on render targets.
  // https://github.com/mrdoob/three.js/pull/16764
  else if (this.isWebGLRenderTarget) {
    // Would be great to actually serialize out the render target,
    // if given a renderer.
    // https://github.com/mrdoob/three.js/issues/16762
  }
  // InterleavedBufferAttributes cannot be serialized,
  // so once patched, this will return some very basic
  // data.
  else if (this.isInterleavedBufferAttribute) {
    data.count = this.count;
    data.itemSize = this.itemSize;
    data.offset = this.offset;
    data.normalized = this.normalized;
  }

  if (data.object) {
    data.object.baseType = baseType;

    if (this.matrix) {
      // Objects should also decompose their matrix for editing
      // in the tools
      this.matrix.decompose(tempPosition, tempRotation, tempScale);
      data.object.position = tempPosition.toArray();
      data.object.rotation = tempEuler.setFromQuaternion(tempRotation).toArray();
      data.object.scale = tempScale.toArray();
    }
  } else {
    data.baseType = baseType;
  }

  return data;
}
});
