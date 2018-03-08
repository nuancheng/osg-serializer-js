const ObjectWrapperManager = require('../ObjectWrapperManager');
const VectorSerializer = require('./Types/VectorSerializer');
const UserSerializer = require('./Types/UserSerializer');
const ObjectWrapper = require('../ObjectWrapper');
const Geometry = require('../OsgTypes/Geometry');
const OsgArray = require('../OsgTypes/OsgArray');
const Associate = require('../Associate');
const DefaultUserDataContainer = require('../OsgTypes/DefaultUserDataContainer');

let objectWrapper = new ObjectWrapper(
    "osg::Geometry",
    ['osg::Object', new Associate("osg::Node", {minVersion: 154}), 'osg::Drawable', 'osg::Geometry'],
    Geometry
);

const AttributeBindingMap = {
    BIND_OFF: 0,
    BIND_OVERALL: 1,
    BIND_PER_PRIMITIVE_SET: 2,
    BIND_PER_PRIMITIVE: 3,
    BIND_PER_VERTEX: 4
};

/**
 *
 * @param {InputStream} inputStream
 * @return {number}
 */
function readAttributeBinding(inputStream) {
    let value = 0;
    if (inputStream.isBinary())
        value = inputStream.inputOperator.readInt();
    else {
        let key = inputStream.inputOperator.readString();
        value = AttributeBindingMap[key];
    }
    return value;
}

/**
 * @param {InputStream} inputStream
 * @return {OsgArray}
 */
function readArray(inputStream) {
    let array = new OsgArray();

    inputStream.readProperty("Array");
    let hasArray = inputStream.inputOperator.readBool();
    if (hasArray) {
        array = inputStream.readArray();
    }
    inputStream.readProperty("Indices");
    let hasIndices = inputStream.inputOperator.readBool();
    if (hasIndices) {
        let indices_array = inputStream.readArray();
        if (indices_array) {
            if (!array.UserDataContainer) // Init UserDataContainer
                array.UserDataContainer = new DefaultUserDataContainer();
            array.UserDataContainer.UserData = indices_array;
        }
    }

    inputStream.readProperty("Binding");
    array.Binding = readAttributeBinding(inputStream);

    inputStream.readProperty("Normalize");
    array.Normalize = (inputStream.inputOperator.readInt() !== 0)

    return array;
}

function getReadArrayDataFunction(property) {
    return function (inputStream, geometry) {
        inputStream.readBeginBracket();
        let array = readArray(inputStream);
        geometry.setProperty(property, array);
        inputStream.readEndBracket();
    }
}

function getReadArrayListFunction(property) {
    return function (inputStream, geometry) {
        let size = inputStream.inputOperator.readUInt();
        inputStream.readBeginBracket();
        let array = readArray(inputStream);
        for (let i = 0; i < size; i++) {
            inputStream.readProperty("Data");
            inputStream.readBeginBracket();

            let array = readArray(inputStream);
            geometry[property].push(array);

            inputStream.readEndBracket();
        }
        inputStream.readEndBracket();

        geometry.setProperty(property, array);
        inputStream.readEndBracket();
    }
}

/**
 * @param {InputStream} inputStream
 * @param {Geometry} Geometry
 */
function readFastPathHint(inputStream, Geometry) {
    if ( !inputStream.isBinary() )
        return inputStream.inputOperator.readBool();
}

objectWrapper.addSerializer(new VectorSerializer("PrimitiveSetList", "PrimitiveSet"));
objectWrapper.addSerializer(new UserSerializer("VertexData", getReadArrayDataFunction("VertexArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("NormalData", getReadArrayDataFunction("NormalArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("ColorData", getReadArrayDataFunction("ColorArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("SecondaryColorData", getReadArrayDataFunction("SecondaryColorArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("FogCoordData", getReadArrayDataFunction("FogCoordArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("TexCoordData", getReadArrayListFunction("TexCoordArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("VertexAttribData", getReadArrayListFunction("VertexAttribArray"), {maxVersion: 111}));
objectWrapper.addSerializer(new UserSerializer("FastPathHint ", readFastPathHint, {maxVersion: 111}));


ObjectWrapperManager.addWrapper(objectWrapper);