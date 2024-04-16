const im = require('imagemagick');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const { promisify } = require('util');

const resizeAsync = promisify(im.resize);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });

const s3 = new AWS.S3();

exports.handler = async (event) => {
    let filesProcessed = event.Records.map(async(record) => {
        const bucket = record.s3.bucket.name;
        const filename = record.s3.object.key;

        const params = {
            Bucket: bucket,
            Key: filename
        };

        const inputData = await s3.getObject(params).promise();

        let tempFile = os.tmpdir() + '/' + uuidv4() + '.jpg';

        let resizeArgs = {
            srcData: inputData.Body,
            dstPath: tempFile,
            width: 150
        };

        await resizeAsync(resizeArgs);

        const resizedData = await readFileAsync(tempFile);

        const targetFileName = filename.substring(0, filename.lastIndexOf('.')) + '-small.jpg';

        const uploadParams = {
            Bucket: bucket + '-dest',
            Key: targetFileName,
            Body: new Buffer(resizedData),
            ContentType: 'image/jpeg'
        };

        await s3.putObject(uploadParams).promise();

        return await unlinkAsync(tempFile);
    });

    await Promise.all(filesProcessed);
    console.log('done');

    return {
        statusCode: 200,
        body: { message: "done" }
    };
};