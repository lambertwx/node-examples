// Example script to download a JPEG image from a URL and upload it to an S3
// bucket.  Also illustrates the use of async and await.

var axios = require('axios');
const fs = require('fs');

// Specify which profile in your ~/.aws/credentials file we will use.
// Note that this must come BEFORE the line that says "require('aws-sdk')"!
process.env.AWS_PROFILE = "developer";

var AWS = require("aws-sdk");


async function fetchFromUrl(url) {
    // The arraybuffer is important because otherwise you won't get the
    // entire image.
    const response = await axios.get(url, { responseType: 'arraybuffer'});
    console.log(`Received ${response.data.length} bytes`);
    return response.data;
}

async function copy_url_into_s3(urlbase, pathfromroot, dest_bucket, check_if_exists) {
    const s3Dest = new AWS.S3({ params: { Bucket: dest_bucket }});
    let skipCopy;

    skipCopy = false;
    if (check_if_exists) {
        const check_params = {
            Bucket: dest_bucket,
            Key: pathfromroot,
        }
        skipCopy = new Promise(resolve => {
            s3Dest.headObject(check_params, function (err, data) {
                    if (err) {
                        // 404 is the normal code we'd get back if the key doesn't exist.
                        if (err.statusCode !== 404) {
                            console.log('Error calling headObject');
                            console.log('err, err.stack', err, err.stack);
                        }
                        resolve(false)
                    } else {
                        console.log("Object exists in destination bucket.  Skipping copy.");
                        resolve(true);
                    }
                }
            );
        });
        await skipCopy
    }
    if (skipCopy) return;
    const fullUrl = urlbase + pathfromroot;
    let data;
    try {
        data = await fetchFromUrl(fullUrl);
    }
    catch(error) {
        console.log("Caught err");
        console.log(error);
    };
    // We won't execute this until after the try block above,because of the await inside it.
    console.log("After the fetchFromUrl call");
    fs.writeFileSync("foobar.jpg", data, function (err) {
      if (err) console.log("ERROR IN WRITING Data");
    });
    const body = Buffer.from(data, "binary");
    const s3Dest        = new AWS.S3({ params: { Bucket: dest_bucket }});
    const params = {
        Body: body,
        Bucket: dest_bucket,
	// Obviously change this if you've got something other than a JPEG.
        ContentType: 'image/jpeg',
        Key: pathfromroot,
    };
    
    s3Dest.putObject(params, function(err, data) {
        if (err) {
            console.log('Error copying to destination');
            console.log('err, err.stack', err, err.stack);

        } else {
            console.log("Copy succeeded");
        }
    });

}



async function main() {
    AWS.config.getCredentials(function (err) {
        if (err) console.log(err.stack);
        // credentials not loaded
        else {
            console.log("Access key:", AWS.config.credentials.accessKeyId);
        }
    });
    console.log("Region: ", AWS.config.region);

    pathfromroot = 'img/iPhone.jpg';
    urlbase = 'http://hidesee.com/';
    await copy_url_into_s3(urlbase, pathfromroot, "my-bucket");
    console.log("After the call to copy");
}

main();

