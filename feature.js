/**|----------------------------------------------------------------------------------------------------------|
*--|--This script is developed by Rahul kumar for Rug Artisan Ltd---------------------------------------------|
* ____________________________________________________________________________________________________________
*|____________________________________________________________________________________________________________|
*
*--|This script handles all the freature in the AR web viewer (such as texture change, material change,-------| 
*--|size calculation and dynamic map tilling and...etc)-------------------------------------------------------| 
* ____________________________________________________________________________________________________________
*|____________________________________________________________________________________________________________|
*
*-|NOTE|There are custom changes in the model Viewer API which is included in the project, if provided--------|
*------|reference of the external model viewer API it will break the code if anyone planning to change the----|
*------|code please be sure what you are doing...(happy coding :) )-------------------------------------------|
*-------------------------------------------------------------------------------------------------------------|*/


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Check for iOS devices
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return 'iOS';
    }

    // Check for Android devices
    if (/android/i.test(userAgent)) {
        return 'Android';
    }

    // Check for Windows devices
    if (/windows phone/i.test(userAgent)) {
        return 'Windows Phone';
    }

    // Check for Mac
    if (/Macintosh|Mac OS X/.test(userAgent)) {
        return 'Mac';
    }

    // Check for Windows
    if (/Win32|Win64|Windows|WinNT/.test(userAgent)) {
        return 'Windows';
    }

    // Check for Linux
    if (/Linux/.test(userAgent)) {
        return 'Linux';
    }

    return 'Unknown';
}

async function fetchWithExponentialBackoff(url, retries = 5, delayTime = 1000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayTime * Math.pow(2, attempt);
                await delay(waitTime);
                attempt++;
                continue;
            }
            return response;
        } catch (error) {
            if (attempt === retries - 1) throw error;
            await delay(delayTime * Math.pow(2, attempt));
            attempt++;
        }
        console.log("Number of attemts: " + attempt);
    }
    throw new Error('Max retries reached');
}

function isValidBase64(str) {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
}


/**|------------------------------------------------------|
 *-|--this is basic image loading function but no in use--|
 *-|------------------------------------------------------|*/
async function loadImageAsTexture1(base64, format) {
    if (!isValidBase64(base64)) {
        throw new Error('Invalid Base64 string');
    }

    const img = new Image();
    img.src = `data:image/${format};base64,${base64}`;
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL(`image/${format}`);
}
/**|-----------------------------------------------------------------|
 *-|--This function gets the image fromn the URL---------------------|
 *-|-----------------------------------------------------------------|*/
async function loadImageAsTexture(url) {
    const response = await fetchWithExponentialBackoff(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    /**-----------------------------------------------|
     *-|--Preparing to read the response as a stream--|
     *-|----------------------------------------------|*/
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || 0;
    let receivedLength = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        /**|----------------------------------|
         *-|----Update progress bar-----------|
         *-|----------------------------------|*/
        if (contentLength > 0) {
            const progress = (receivedLength / contentLength) * 100;

            const progressBar = document.querySelector('model-viewer').querySelector('.progress-bar');
            const updatingBar = document.querySelector('model-viewer').querySelector('.update-bar');
            updatingBar.style.width = `${progress}%`;
            if (progress === 100) {
                progressBar.classList.add('hide');
            } else {
                progressBar.classList.remove('hide');
            }
        }

        else {
            /** Indeterminate progress */

            console.log("loading...: ");
        }
    }

    /**|---------------------------------------------|
     *-|--Combining chunks into a single Uint8Array--|
     *-|---------------------------------------------|*/
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    /**|-------------------------------------------------|
     *-|--Creating a Blob from the combined chunks-------|
     *-|-------------------------------------------------|*/
    const blob = new Blob([chunksAll]);
    const fileExtension = url.split('.').pop().toLowerCase();

    /**|-------------------------------------------------------|
     *-|--Checking for the imge type based on file signature---|
     *-|-------------------------------------------------------|*/
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let imgType = '';
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
        imgType = 'image/jpeg';
    } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        imgType = 'image/png';
    } else if (uint8Array[0] === 0x3C && uint8Array[1] === 0x3F && uint8Array[2] === 0x78 && uint8Array[3] === 0x6D) {
        imgType = 'image/svg+xml';
    }

    //console.log('Detected image type:', imgType || 'unknown');

    if (imgType === 'image/svg+xml') {
        const svgText = await blob.text();
        const blobUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));

        const img = new Image();
        img.src = blobUrl;
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const textureUrl = canvas.toDataURL('image/png');
        return textureUrl;
    } else if (imgType === 'image/png' || imgType === 'image/jpeg') {
        return URL.createObjectURL(blob);
    } else {
        // Fallback based on file extension
        if (fileExtension === 'png' || fileExtension === 'jpeg' || fileExtension === 'jpg') {
            return URL.createObjectURL(blob);
        } else {
            throw new Error('Unsupported image type');
        }
    }
}

let model_change = false;
/**|-------------------------------------------------------------------|
 *-|--this function handles the rug shape change-----------------------|
 *-|-------------------------------------------------------------------|*/
function change_Rug_Shape(shapename, model) {
    //console.log("shape name: " + shapename);
    if (shapename === "rectangle") {
        model.src = "rug_Models/rect.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "round") {
        model.src = "rug_Models/round.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "oval") {
        model.src = "rug_Models/oval.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "hexagon") {
        model.src = "rug_Models/hexagon.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "halfmoon") {
        model.src = "rug_Models/halfmoon.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "diamond") {
        model.src = "rug_Models/diamond.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "eight") {
        model.src = "rug_Models/eight.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "drop") {
        model.src = "rug_Models/drop.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "oblong") {
        model.src = "rug_Models/oblong.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "arch") {
        model.src = "rug_Models/arch.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "runner") {
        model.src = "rug_Models/runner.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "ogee") {
        model.src = "rug_Models/ogee.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "square") {
        model.src = "rug_Models/square.glb";
        // console.log("shape changed to: " + shapename);
    }
    else if (shapename === "splash") {
        model.src = "rug_Models/splash.glb";
        //console.log("shape changed to: " + shapename);
    }
    else if (shapename === "capsule") {
        model.src = "rug_Models/capsule.glb";
        //console.log("shape changed to: " + shapename);
    }
}


/**|-----------------------------------------------------------------------|
 * |---This funtion handles the image aplha channel which we can set-------|
 * |---using this function before creating the texture using model viewer--|
 * |NOTE|--function is not in use because model viewer does not supports---|
 * |----|--the alpha channel for the texture wich is created byt the model-|
 * |----|--model viewer (leaving this for the future use)------------------|
 * |-----------------------------------------------------------------------|
 */
async function modifyAlphaChannel(textureURL, alphaValue) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; /**--Ensuring cross-origin loading--*/

    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 3; i < data.length; i += 4) {
                data[i] = alphaValue; /** Set alpha value (0-255)*/
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((blob) => {
                const newTextureURL = URL.createObjectURL(blob);
                resolve(newTextureURL);
            }, "image/png");
        };

        img.onerror = (err) => reject(err);

        img.src = textureURL;
    });
}

/**|--------------------------------------------------------------------------------------------|
 * |--this function handles the blending of the color overlay and texture or achiving the-------|
 * |--tranperency effect can use this function or create a texture with the blend and then------|
 * |--convert the image to model viewer texture-------------------------------------------------|
 * |Note|--It is done because model viewer does not support the trasperancy or opacity of the---|
 * |----|--texture directly it support material transperancy which was not giving the desired---|
 * |----|--output-------------------------------------------------------------------------------|
 * |--------------------------------------------------------------------------------------------|
 */
async function blendImages(originalImageURL, overlayColor = "white", opacity = 0.5, flipHorizontally = false, flipVertically = false) {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.fillStyle = overlayColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalAlpha = opacity;

            ctx.save();

            ctx.scale(
                flipHorizontally ? -1 : 1,
                flipVertically ? -1 : 1
            );

            ctx.drawImage(
                img,
                flipHorizontally ? -canvas.width : 0,
                flipVertically ? -canvas.height : 0,
                canvas.width,
                canvas.height
            );

            ctx.restore();

            ctx.globalAlpha = 1.0;

            canvas.toBlob((blob) => {
                const newTextureURL = URL.createObjectURL(blob);
                resolve(newTextureURL);
            }, "image/png");
        };

        img.onerror = (err) => reject(err);

        img.src = originalImageURL;
    });
}

/**|--------------------------------------------------------------------------------|
 * |---This function handles the blending of the two textures (overlay the texture--|
 * |---on the original texture) using this function for overlaying the border-------|
 * |---texture to the original texture----------------------------------------------|
 * |Note|--In future this function can be used for overlaying other texture also----|
 * -----|--shuch as normal map, roughness map and OC map----------------------------|
 * -----|--(used it in the backtexture of the hand knotted ttexture) (not in use)---|
 * |--------------------------------------------------------------------------------|
 */
async function overlayImages(originalImageURL, overlayImageURL, flipHorizontally = false, flipVertically = false) {
    const originalImg = new Image();
    originalImg.crossOrigin = "Anonymous";

    const overlayImg = new Image();
    overlayImg.crossOrigin = "Anonymous";

    return new Promise((resolve, reject) => {
        originalImg.onload = () => {
            overlayImg.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = originalImg.width;
                canvas.height = originalImg.height;

                ctx.save();

                ctx.scale(
                    flipHorizontally ? -1 : 1,
                    flipVertically ? -1 : 1
                );

                ctx.drawImage(
                    originalImg,
                    flipHorizontally ? -canvas.width : 0,
                    flipVertically ? -canvas.height : 0,
                    canvas.width,
                    canvas.height
                );

                ctx.restore();

                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    const newTextureURL = URL.createObjectURL(blob);
                    resolve(newTextureURL);
                }, "image/png");
            };

            overlayImg.onerror = (err) => reject(err);

            overlayImg.src = overlayImageURL;
        };

        originalImg.onerror = (err) => reject(err);

        originalImg.src = originalImageURL;
    });
}

/**|------------------------------------------------------------------------------------------------|
 * |--This function handles the tilling and ovelaying of the texture, we are using this for---------|
 * |--tilling main texture and overlaying the border texture (using it in backtexture hantufted)----|
 * |------------------------------------------------------------------------------------------------|
 */
async function createTiledTextureWithOverlay(originalImageURL, overlayImageURL, widthTilingFactor = 2, heightTilingFactor = 2) {
    const originalImg = new Image();
    originalImg.crossOrigin = "Anonymous";

    const overlayImg = new Image();
    overlayImg.crossOrigin = "Anonymous";

    return new Promise((resolve, reject) => {
        originalImg.onload = () => {
            overlayImg.onload = () => {

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = originalImg.width * widthTilingFactor;
                canvas.height = originalImg.height * heightTilingFactor;

                for (let x = 0; x < widthTilingFactor; x++) {
                    for (let y = 0; y < heightTilingFactor; y++) {
                        ctx.drawImage(originalImg, x * originalImg.width, y * originalImg.height, originalImg.width, originalImg.height);
                    }
                }

                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    const combinedTextureURL = URL.createObjectURL(blob);
                    resolve(combinedTextureURL);
                }, "image/png");
            };

            overlayImg.onerror = (err) => reject(err);
            overlayImg.src = overlayImageURL;
        };

        originalImg.onerror = (err) => reject(err);
        originalImg.src = originalImageURL;
    });
}

async function createTiledTexture(originalImageURL, widthTilingFactor = 2, heightTilingFactor = 2) {
    const originalImg = new Image();
    originalImg.crossOrigin = "Anonymous";

    return new Promise((resolve, reject) => {
        originalImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = originalImg.width * widthTilingFactor;
            canvas.height = originalImg.height * heightTilingFactor;

            for (let x = 0; x < widthTilingFactor; x++) {
                for (let y = 0; y < heightTilingFactor; y++) {
                    ctx.drawImage(originalImg, x * originalImg.width, y * originalImg.height, originalImg.width, originalImg.height);
                }
            }

            canvas.toBlob((blob) => {
                const tiledTextureURL = URL.createObjectURL(blob);
                resolve(tiledTextureURL);
            }, "image/png");
        };

        originalImg.onerror = (err) => reject(err);
        originalImg.src = originalImageURL;
    });
}

// Helper function to load images with a Promise
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
        img.src = url;
    });
}


function updateProgress(step, totalSteps) {
    const progressBar = document.querySelector('.progress-bar')
    const updatingBar = document.querySelector('.update-bar');

    const progressPercentage = (step / totalSteps);
    updatingBar.style.width = `${progressPercentage * 100}%`;
    //console.log("progress texture loading applying:: ",progressPercentage);
    if (progressPercentage >= 1) {
        progressBar.classList.add('hide');
    }
    else {
        progressBar.classList.remove('hide');
    }

}

/**|----------------------------------------------------------------------------------------|
 * |-------this var is used in checking if the rug type is hand tufted or hand knoted-------|
 * |-------according to ths we will change the rug model or model's y scale whatever works--|
 * |----------------------------------------------------------------------------------------| */
let rugType = "";
let nor_m_texture;
let mr_m_texture;
let ocm_m_texture;
/**|--------------------------------------------------------------------------------|
 * |------this function handles the change of the material texture according--------|
 * |------to user input which we are getting from the url, here in this function----|
 * |------we are cahnging the base texture, normal map, rougthness map and AO map---|
 * |------and also chaging the rug type which is handtufted and handknotted---------|
 * |------according to the type of the rug material properties will be assigned-----|
 * |--------------------------------------------------------------------------------|
 */
async function get_set_MainTexture(rug_type, material_type, modeviewer, material, textureURL, nor_m_m_texture, mrm_m_texture, oc_m_m_texture) {
  
    if (rug_type === "handtufted") {
        rugType = rug_type;
        if (material_type === "tibetan_wool" || material_type === "new_zealand_wool" || material_type === "pure_wool") {

            /**const alphaValue = 125; // Set desired alpha (0-255)
             Modify the alpha channel of the texture
            const modifiedTextureURL = await modifyAlphaChannel(textureURL, alphaValue);*/
          
            const texture = await modeviewer.createTexture(textureURL);
          
            //const normal_texture = await modeviewer.createTexture("Defalut_Maps/wool/wool_nor_n.png");
          
            //const roughtness_texture = await modeviewer.createTexture("Defalut_Maps/wool/SpecularMap.png");
        
           // const oc_texture = await modeviewer.createTexture("Defalut_Maps/wool/Wool_oc_n.png");

            const nm_texture = nor_m_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_nor.png", 2, 2);
            const normal_texture = await modeviewer.createTexture(nm_texture);

         
            const rm_texture = mrm_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_mr.png", 2, 2);
            const roughtness_texture = await modeviewer.createTexture(rm_texture);

          
            const oc_m_texture = oc_m_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_oc.png", 3, 3);
            const oc_texture = await modeviewer.createTexture(oc_m_texture);

            /**|------------------------------------------------------|
             * |-----updating the wool material texture's-------------|
             * |------------------------------------------------------|
             */
            //material.setAlphaMode('BLEND');
     
            console.debug('getting the alpha mode: ', material.getAlphaMode());
            if (material.pbrMetallicRoughness) {
                material.pbrMetallicRoughness.setMetallicFactor(.9);
                material.pbrMetallicRoughness.setRoughnessFactor(1.25);
                // material.pbrMetallicRoughness.setBaseColorFactor([3, 3, 3]);
     
                material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                //material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 0.5]; // Setting alpha (opacity)
                //material.alphaMode = 'BLEND';
                material.normalTexture.setTexture(normal_texture);
                material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_texture);
                material.occlusionTexture.setTexture(oc_texture);

     
                nor_sampler = material.normalTexture.texture.sampler;
                mr_sampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
                oc_sampler = material.occlusionTexture.texture.sampler;

                //till_uv_maps(parseFloat(getXScale(modelViewerTexture1.scale.toString())));
               
               // mr_sampler.setScale({ u: 3, v: 3 });
                //nor_sampler.setScale({ u: 3, v: 3 });
                //oc_sampler.setScale({ u: 3, v: 3 });

                default_tilling = nor_sampler.scale.u;
            }
        }
        else if (material_type === "pure_silk" || material_type === "bamboo_silk") {
        
            const texture = await modeviewer.createTexture(textureURL);

           
            const nm_texture = nor_m_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_nor.png", 2, 2);
            const normal_texture = await modeviewer.createTexture(nm_texture);

         
            const rm_texture = mrm_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_mr.png", 2, 2);
            const roughtness_texture = await modeviewer.createTexture(rm_texture);

          
            const oc_m_texture = oc_m_m_texture;//await createTiledTexture("Defalut_Maps/silk/Silk_oc.png", 3, 3);
            const oc_texture = await modeviewer.createTexture(oc_m_texture);

            /**|------------------------------------------------------|
             * |-------updating the silk material texture's-----------|
             * |------------------------------------------------------|
             */
      
            if (material.pbrMetallicRoughness) {
                /**|-----material metallic factor 0.8 is good value for the silk */
                /**|-----material roughness factor 0.95 is good value for the silk */
                material.pbrMetallicRoughness.setMetallicFactor(.8);
                material.pbrMetallicRoughness.setRoughnessFactor(.95);

               
                material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                material.normalTexture.setTexture(normal_texture);
                material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_texture);
                material.occlusionTexture.setTexture(oc_texture);

               
                nor_sampler = material.normalTexture.texture.sampler;
                mr_sampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
                oc_sampler = material.occlusionTexture.texture.sampler;

                //till_uv_maps(parseFloat(getXScale(modelViewerTexture1.scale.toString())));

            
               // mr_sampler.setScale({ u: 2, v: 2 });
                //nor_sampler.setScale({ u: 2, v: 2 });
                //oc_sampler.setScale({ u: 2, v: 2 });
                /**getting the default tilling value */
                default_tilling = nor_sampler.scale.u;
            }
        }
    }
    else if (rug_type === "handknotted" || rug_type === "flatweave") {
        rugType = rug_type;
        if (material_type === "tibetan_wool" || material_type === "new_zealand_wool" || material_type === "pure_wool") {

            //const alphaValue = 125; // Set desired alpha (0-255)

            // Modify the alpha channel of the texture
            //const modifiedTextureURL = await modifyAlphaChannel(textureURL, alphaValue);
     
            const texture = await modeviewer.createTexture(textureURL);
        
            const normal_texture = await modeviewer.createTexture("Defalut_Maps/wool/wool_nor_n.png");
     
            const roughtness_texture = await modeviewer.createTexture("Defalut_Maps/wool/SpecularMap.png");
    
            const oc_texture = await modeviewer.createTexture("Defalut_Maps/wool/Wool_oc_n.png");

            /**|------------------------------------------------------|
             * |-----updating the wool material texture's-------------|
             * |------------------------------------------------------|
             */
            //material.setAlphaMode('BLEND');
     
            console.debug('getting the alpha mode: ', material.getAlphaMode());
            if (material.pbrMetallicRoughness) {
                material.pbrMetallicRoughness.setMetallicFactor(.9);
                material.pbrMetallicRoughness.setRoughnessFactor(1.25);
                // material.pbrMetallicRoughness.setBaseColorFactor([3, 3, 3]);

                material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                //material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 0.5]; // Setting alpha (opacity)
                //material.alphaMode = 'BLEND';
                material.normalTexture.setTexture(normal_texture);
                material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_texture);
                material.occlusionTexture.setTexture(oc_texture);

       
                nor_sampler = material.normalTexture.texture.sampler;
                mr_sampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
                oc_sampler = material.occlusionTexture.texture.sampler;

                //till_uv_maps(parseFloat(getXScale(modelViewerTexture1.scale.toString())));

              
                mr_sampler.setScale({ u: 3, v: 3 });
                nor_sampler.setScale({ u: 3, v: 3 });
                oc_sampler.setScale({ u: 3, v: 3 });

                default_tilling = nor_sampler.scale.u;
            }
        }
        else if (material_type === "pure_silk" || material_type === "bamboo_silk") {

            const texture = await modeviewer.createTexture(textureURL);

            const normal_texture = await modeviewer.createTexture("Defalut_Maps/silk/Silk_nor.png");
   
            const roughtness_texture = await modeviewer.createTexture("Defalut_Maps/silk/Silk_mr.png");
   
            const oc_texture = await modeviewer.createTexture("Defalut_Maps/silk/Silk_oc.png");

            /**|------------------------------------------------------|
             * |-------updating the silk material texture's-----------|
             * |------------------------------------------------------|
             */
  
            if (material.pbrMetallicRoughness) {
                /**|-----material metallic factor 0.8 is good value for the silk */
                /**|-----material roughness factor 0.95 is good value for the silk */
                material.pbrMetallicRoughness.setMetallicFactor(.8);
                material.pbrMetallicRoughness.setRoughnessFactor(.95);

         
                material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                material.normalTexture.setTexture(normal_texture);
                material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_texture);
                material.occlusionTexture.setTexture(oc_texture);

           
                nor_sampler = material.normalTexture.texture.sampler;
                mr_sampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
                oc_sampler = material.occlusionTexture.texture.sampler;

                //till_uv_maps(parseFloat(getXScale(modelViewerTexture1.scale.toString())));
                /**|--------------------------------------------------------|
                 * |---here we are setting the uv tilling of the textures---|
                 * |--------------------------------------------------------|
                 */
   
                mr_sampler.setScale({ u: 2, v: 2 });
                nor_sampler.setScale({ u: 2, v: 2 });
                oc_sampler.setScale({ u: 2, v: 2 });

                /**getting the default tilling value */
                default_tilling = nor_sampler.scale.u;
            }
        }
    }
}

/**|------------------------------------------------------------------------------------------|
 * |--this function handles the setting the backTexture of the rug and changes according to---|
 * |--user input (rug type === handknotted or handtufted)-------------------------------------|
 * |------------------------------------------------------------------------------------------|
 */
async function get_set_backTexture(rug_type, modelviewer, material, textureURL, shape_param) {
    if (rug_type === "handtufted") {

        /**|-----------------------------------------------------------------|
         * |----------------------------To Do--------------------------------|
         * |-----------------------------------------------------------------|
         * |--need to add the border only perblem is the texture is getting--|
         * |--tilled need to modify the texture after getting tilled---------|
         * |-----------------------------------------------------------------|
         * |--------------------------New To Do------------------------------|
         * |-----------------------------------------------------------------|
         * |--Need to remove the border from the back texture (handknotted)--|
         * |--and need to add in the back texture of the handtufted----------|
         * |-----------------------------------------------------------------|*/
        const b_t_Main = "Back_texture/Fabric_Pattern_04_ambientocclusion.jpg";
        const b_t_border = "Defalut_Maps/border_logo.png";
        let final_main_backTexture = b_t_Main;
        if (shape_param !== "arch" && shape_param !== "capsule" && shape_param !== "drop" && shape_param !== "ogee" && shape_param !== "oval" && shape_param !== "diamond" && shape_param != "splash") {
            //console.log("-----------------I am running-----------------thats not good(now script changed):::: ", shape_param);
            if (shape_param === "runner!" || shape_param === "runner") {
                final_main_backTexture = await createTiledTextureWithOverlay(b_t_Main, b_t_border, 2, 4);/**with the texture sampler tilling we need to set tilling in this function also */
            }
            else {
                final_main_backTexture = await createTiledTextureWithOverlay(b_t_Main, b_t_border, 2, 2);/**with the texture sampler tilling we need to set tilling in this function also */
            }
        }
        else {
            final_main_backTexture = b_t_Main;
        }
        const backtexture = await modelviewer.createTexture(final_main_backTexture);
        const normal_backtexture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_normal.jpg");
        const roughtness_backtexture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_metallic.jpg");
        //const oc_texture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_ambientocclusion.jpg");
        //back_material.setAlphaMode('BLEND');
        if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.baseColorTexture.setTexture(backtexture);
            material.normalTexture.setTexture(normal_backtexture);
            material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_backtexture);
            //material.occlusionTexture.setTexture(oc_texture);

            const backTexture = material.pbrMetallicRoughness.baseColorTexture.texture.sampler;
            const nor_backsampler = material.normalTexture.texture.sampler;
            const mr_backsampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
            //const oc_backsampler = material.occlusionTexture.texture.sampler;

            if (shape_param === "arch" || shape_param === "capsule" || shape_param === "drop" || shape_param === "ogee" || shape_param === "oval" || shape_param === "diamond" || shape_param === "splash") {

                backTexture.setScale({ u: 2, v: 2 });
                nor_backsampler.setScale({ u: 2, v: 2 });
                mr_backsampler.setScale({ u: 2, v: 2 });
                //oc_backsampler.setScale({ u: 2, v: 2 });
            }
            else if (shape_param === "runner!" || shape_param === "runner") {
                //backTexture.setScale({ u: 2, v: 3 });
                nor_backsampler.setScale({ u: 2, v: 4 });
                mr_backsampler.setScale({ u: 2, v: 4 });
                //oc_backsampler.setScale({ u: 2, v: 3 });
            }

            /**|----------------------------------------------------------------|
             *-|----this will force scene viewer to directly open in AR Mode----|
             *-|----------------------------------------------------------------|*/
            //modelViewerTexture1.activateAR();

        } else {
            console.error('Material does not support pbrMetallicRoughness');
        }
    }
    else if (rug_type === "handknotted" || rug_type === "flatweave") {
        const blendedTextureURL = await blendImages(textureURL, "MintCream", .5, true, false);
        const borderTexture = "Defalut_Maps/border_logo.png";
        let finalTexture = blendedTextureURL;
        //console.log("getting the shape type--------:: ", shape_param);
        if (shape_param === "rectangle" || shape_param === "square") {
            const blendedbordertexture = await overlayImages(blendedTextureURL, borderTexture, false, false);
            //finalTexture=blendedbordertexture;
            //console.log("getting the final texture--------");
        }
        else {
            // finalTexture=blendedTextureURL;
        }

        const backtexture = await modelviewer.createTexture(finalTexture);
        const normal_backtexture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_normal.jpg");
        const roughtness_backtexture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_metallic.jpg");
        const oc_texture = await modelviewer.createTexture("Back_texture/Fabric_Pattern_04_ambientocclusion_oc_new.jpg");
        //back_material.setAlphaMode('BLEND');
        if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.baseColorTexture.setTexture(backtexture);
            material.normalTexture.setTexture(normal_backtexture);
            material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_backtexture);
            material.occlusionTexture.setTexture(oc_texture);

            const backTexture = material.pbrMetallicRoughness.baseColorTexture.texture.sampler;
            const nor_backsampler = material.normalTexture.texture.sampler;
            const mr_backsampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
            const oc_backsampler = material.occlusionTexture.texture.sampler;

            if (shape_param === "runner!" || shape_param === "runner") {
                backTexture.setScale({ u: 1, v: 1 });
                nor_backsampler.setScale({ u: 2, v: 4 });
                mr_backsampler.setScale({ u: 2, v: 4 });
                oc_backsampler.setScale({ u: 2, v: 4 });
            } else {
                backTexture.setScale({ u: 1, v: 1 });
                nor_backsampler.setScale({ u: 2, v: 2 });
                mr_backsampler.setScale({ u: 2, v: 2 });
                oc_backsampler.setScale({ u: 2, v: 2 });
            }
        } else {
            console.error('Material does not support pbrMetallicRoughness');
        }
    }
}

/**|------------------------------------------------------------------------|
 * |-------------------------------TO DO------------------------------------|
 * |________________________________________________________________________|
 * |Set scale and size of the rug according to the data fetched from the URL|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * 
 * |-----------------------------------------|
 * |--Workflow (How this feature will work)--|
 * |-----------------------------------------|
 *                    ||
 *                    \/
 * |1|---------Parameter setup----------------------------------------------|
 * --|1.1|-----Get the parameters from the URL------------------------------|
 * --|1.2|-----Check the size parameter if it is in 'ft' or in 'cm'---------|
 * --|1.3|-----Assign the width and length param according to the format----|
 * ------|-----and have to show the pram 'ft' or 'cm' in the viewer---------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * 
 * |2|---------Calculate the width and length percentage according to the---|
 * --|---------original or default size of the rug in the scene to check----|
 * --|---------how much the default size is bigger or smaller then the------|
 * --|---------size we got from the URL in percentage.----------------------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 *                                                       (scale)
 * |3|---------Now calculate the scale and check if default ^ is needed to--| 
 * --|---------be increased or decreased. The default scale is always-------| 
 * --|---------vector3(1,1,1). Now scale the rug with the value got from----| 
 * --|---------calculation.This will set the size and scale of the rug as---| 
 * --|---------per the data got from the url and scale is 100% in AR Mode it|
 * --|---------will be visible in correct size and user can scale the-------|
 * --|---------rug for different scale(size) but the ratio of the scale-----| 
 * --|---------will be the same ex:4/3 or 7/5 or 5/1, etc. whatever user----| 
 * --|---------selected on the website--------------------------------------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * 
 * |4|--------Real time scale calculation for the rug in AR mode.-----------|
 * --|--------Get the current scale of the scene(model), intitially when----|
 * --|--------object get placed in ar mode the scale of the scene(model)----|
 * --|--------will be 100% when user start scaling the scene up and down----|
 * --|--------the scale percentage will change, according to that we will---|
 * --|--------calculate the scale and size of the rug in real time----------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * 
 * |NOTE|------models z is width and x is length in this scene--------------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * |NOTE|---Already impelemented everything leaving this here just for the--|
 * -----|---future reference------------------------------------------------|
 *-|------------------------------------------------------------------------|
 */

let size_para_format = 'cm';
let u_width = 0;
let u_length = 0;

function set_rug_scale_size(parameter, width, length, defualtRug_widht, defaultRug_length) {

    let updated_width = 0;
    let updated_length = 0;

    /**|-----------------------------------------------------------------|
     *-|---if parameter is ft the width amd length is always in inches---|
     *-|---if parameter is cm then its cm--------------------------------|
     *-|-----------------------------------------------------------------|*/
    if (parameter === "ft") {
        //console.log("inside ft");

        /**|------------------------------------|
         *-|---converting the size in inches----|
         *-|------------------------------------|*/
        const def_width_in = defualtRug_widht / 0.0254;
        const def_length_in = defaultRug_length / 0.0254;

        const per_width = claculate_scale_percentage(width, def_width_in);
        const per_length = claculate_scale_percentage(length, def_length_in);
        const width_final_val = get_updated_scale_value(per_width);
        const length_final_val = get_updated_scale_value(per_length);
        updated_width = width_final_val;
        updated_length = length_final_val;
        size_para_format = "ft";

    }
    if (parameter === "cm") {
        //console.log("inside cm");

        /**|---------------------------------------|
         *-|------converting the size in cm--------|
         *-|---------------------------------------|*/
        const def_width_cm = defualtRug_widht * 100;
        const def_length_cm = defaultRug_length * 100;

        const per_width = claculate_scale_percentage(width, def_width_cm);
        const per_length = claculate_scale_percentage(length, def_length_cm);
        const width_final_val = get_updated_scale_value(per_width);
        const length_final_val = get_updated_scale_value(per_length);
        updated_width = width_final_val;
        updated_length = length_final_val;
        size_para_format = "cm";
    }
    u_width = updated_width;
    u_length = updated_length;
}

function claculate_scale_percentage(val, default_val) {

    return (val / default_val) * 100;
}

function get_updated_scale_value(percentage) {

    const new_val = (percentage * 1) / 100;

    return new_val;
}

const modelViewer1 = document.querySelector("#model");

/**|----------------------------------------------------------| 
*--|--This function handles the scale change of the model as--| 
*--|--per the user input (which comes from the URL)-----------|
*--|----------------------------------------------------------|*/
async function scale_change(parameter, user_width, user_length, rugtype) {

    if (modelViewer1.loaded) {
        // console.log("Model is getting updated ");
        set_rug_scale_size(parameter, user_width, user_length, modelViewer1.getDimensions().z, modelViewer1.getDimensions().x);

        //console.log("before delay");
        await delay(1);
        dimension_calculation();
        //console.log("after delay");
        //console.debug("updated scale before scaling: ", " length: ", u_length, " width: ", u_width);
        if (rugtype === "handtufted") {
            modelViewer1.scale = `${u_length} ${1} ${u_width}`;
        }
        else if (rugtype === "handknotted" || rugtype === "flatweave") {
            modelViewer1.scale = `${u_length} ${.1} ${u_width}`;
        }
        modelViewer1.updateFraming();
        //console.debug("updated scale after scaling: ", " length: ", u_length, " width: ", u_width);
    }
}

/**|--------------------------------------------------------|
*--|---real time scale calculation feature fro AR mode------|
*--|--------------------------------------------------------|*/
function cal_scale_AR_mode(model_width, scale_percentage) {
    const width_val = (scale_percentage * model_width) / 100;
    return width_val;
}
/**|-----------------------------------------------------------------------------------------------|*/
/**|-----------------------------------------------------------------------------------------------|*/

/**
 * --|TO DO|--
 * --creating feature for the dynamic scaling of the texture like normal oc and roughness-------
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 * 
 * |1|--getting the default scale of the scene(model) and number of tilling-|
 * --|--now according to the changed scale need to calculate the number of--|
 * --|--tilling-------------------------------------------------------------|
 *  ________________________________________________________________________
 * |________________________________________________________________________|
 */

/** This function retuns the tilling value */
function texture_tilling(default_tilling, model_scale, percentage) {

    const tilling_val = (default_tilling * percentage) / 100;

    /** Round to the nearest integer */
    const tilling_val_temp = Math.round(tilling_val);

    /** Ensure the tiling value is positive */
    const _tilling_val = Math.max(tilling_val_temp, 1);

    return _tilling_val;
}

let model_scale_percentage_AR_Mode = 0;

/**|-----------------------------------------------------------------------------------|
 *-|--getting scale of the model when in the scene viewer mode (when model is loaded)--|
 *-|-----------------------------------------------------------------------------------|*/
/**function getXScale(scaleString) {
    // Split the string by spaces to get each component
    let scaleValues = scaleString.split(' ');

    // Convert the first value to a float (this is the x value)
    let xScale = parseFloat(scaleValues[0]);

    return xScale;
}*/

let up_rug_width = 0;
let up_rug_length = 0;
let scaled_size_ARmode = 0;

let nor_sampler;
let mr_sampler;
let oc_sampler;
let default_tilling = 0;

/**|----------------------------------------------------------------|
 *-|-getting scene scale finally getting the scene scale in AR Mode-|
 * |----------------------------------------------------------------|*/
const modelViewer = document.querySelector('#model');

//const scaleDisplay = document.querySelector('#info');
let scale_temp = 0;
let temp_percentage = 0;
let temp_val_width = 0;
let temp_val_length = 0;
let is_ARmode = false;

let isScaling = false;
let previousScale = null;
let scaleTimeout = null;
let is_Tilling = false;
let is_Tilled = true;

/**|--------------------------------------------------------------------------------------|
 * |-This function checks if the model or scene is scaling or not-------------------------|
 * |NOTE|-can access the scale of the model in AR Mode using this modelViewer.cModelScale-|
 * |--------------------------------------------------------------------------------------|*/
function check_is_Scaling(scale, delay) {

    const currentScale = scale;
    if (previousScale === null) {
        previousScale = currentScale;
        return false;
    }

    if (currentScale != previousScale) {

        isScaling = true;
        is_Tilling = true;

        scaleTimeout = setTimeout(() => {
            previousScale = currentScale;
            is_Tilled = false;
        }, delay);

    }
    else {
        scaleTimeout = setTimeout(() => {
            if (currentScale === previousScale) {
                isScaling = false;
                if (is_Tilled === false) {
                    is_Tilling = false;
                }
            }

        }, delay);
    }
    return isScaling;
}

/**|-----This var is just for debuging use----|*/
let current_tilling = 0;
/**|------------------------------------------|*/

//const info_interaction = document.querySelector('#info');
/** Call checkScale periodically, e.g., with a setInterval */

setInterval(() => {
    //const isCurrentlyScaling = checkScale();
    const is_sacling = check_is_Scaling(modelViewer.cModelScale.x, 100);

    //info_interaction.textContent = `---isScale: ${is_sacling} scale:: ${model_scale_percentage_AR_Mode} DF: ${default_tilling} CF: ${current_tilling}`;
    //console.log('Is scaling: ', is_Tilling, ' :: ', modelViewer.cModelScale.x);

}, 100);

/**|-----------------------------------------------------|
*--|----this function tills the texture maps-------------|
*--|-----------------------------------------------------|*/
function till_uv_maps(current_default_tilling, model_scale, percentage) {

    if (mr_sampler != null && mr_sampler != null && oc_sampler != null && isScaling === false && is_Tilling === false) {

        //console.log("texture got tilled: ", texture_tilling(current_default_tilling, model_scale, percentage));
        if (mr_sampler.scale.u.toString() != texture_tilling(current_default_tilling, model_scale, percentage)) {
            mr_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale, percentage), v: texture_tilling(current_default_tilling, model_scale, percentage) });
            nor_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale, percentage), v: texture_tilling(current_default_tilling, model_scale, percentage) });
            oc_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale, percentage), v: texture_tilling(current_default_tilling, model_scale, percentage) });
            //console.log("texture got tilled: ", texture_tilling(current_default_tilling, model_scale, percentage));
            current_tilling = texture_tilling(current_default_tilling, model_scale, percentage);
            is_Tilled = true;
            is_Tilling = true;
        }
    }
}

const scale_percentage_UI = modelViewer.querySelector('#scale_percentage');

/**|-------------------------------------------------------------------------------| 
*--|---This function checks the updated scale realtime and updates the properties--| 
*--|-------------------------------------------------------------------------------|*/
function updateScaleDisplay() {
    const scale = modelViewer.cModelScale;

    // console.log('get scale function test inner output: ', scale);
    if (scale) {
        const scalePercentage = (scale.x * 100).toFixed(0); // Assuming uniform scaling
        scale_temp = (scalePercentage - 100) / 100;
        temp_percentage = scalePercentage;
        model_scale_percentage_AR_Mode = scalePercentage;
        scale_percentage_UI.textContent = `${scalePercentage}%`;
        dimension_calculation();
        //console.log("model scale in ar mode: ", scale.x ,"An current uv tilling: ",nor_sampler.scale.u)

        /**|------------------------------------------------------------|
         * |-calling function for dynamic texture UV tilling in AR Mode-|
         * |------------------------------------------------------------|*/
        if (is_ARmode) {
            till_uv_maps(default_tilling, scale.x, model_scale_percentage_AR_Mode);
        }
    }
}

modelViewer.addEventListener('interact-stopped', (event) => {

    //console.log('User is scaling the scene in AR mode interaction status:', event.detail.status);
    /**const info_interaction = modelViewer.querySelector('#info');*/
    /**scaleDisplay.textContent = `Scale: ${event.detail.status}%`;*/
    /**Add any other actions you want to perform when scaling is detected*/
});

modelViewer.addEventListener('load', updateScaleDisplay);
modelViewer.addEventListener('camera-change', updateScaleDisplay);

/**|------------------------------------------------------|
*--|-----Model size calculation and size UI update--------|
*--|------------------------------------------------------|*/

const checkboxui_bg = modelViewer.querySelector('#controls');
const checkbox = modelViewer.querySelector('#show-dimensions');

const dimElements = [...modelViewer.querySelectorAll('#size_ui'), modelViewer.querySelector('#dimLines')];
const checkboxui = modelViewer.querySelector('.check');

const scale_per_UI = modelViewer.querySelector('.hotspot');

/**|----------------------------------------------------|
 * |--sets the visibility of the size check nbox panel--|
 * |----------------------------------------------------|*/

function setVisibility(visible) {
    dimElements.forEach((element) => {
        if (visible) {
            element.classList.remove('hide');
        } else {
            element.classList.add('hide');
        }
    });
}

checkbox.addEventListener('change', () => {
    setVisibility(checkbox.checked);
    //dimension_calculation();
});

/**|---------------------------------------------------------------------------------------------------|*/
/**|---------------------------------------------------------------------------------------------------|*/

/**|-------------------------------------------------------------|
 * |-------checks the AR status and handles the ui toggle--------|
 * |-------------------------------------------------------------|*/
modelViewer.addEventListener('ar-status', (event) => {
    //setVisibility(checkbox.checked && event.detail.status !== 'session-started');

    const arStatus = event.detail.status;
    //console.log("AR stuts: ",arStatus);
    if (arStatus === 'session-started') {
        //console.log('AR mode started');
    }
    else if (arStatus === 'object-placed') {
        // console.log('AR mode object is placed');
        dimElements.forEach((element) => {
            element.classList.remove('hide');
        });
        checkboxui.classList.remove('hide');
        checkbox.classList.remove('hide');
        checkboxui_bg.classList.remove('hide');
        scale_per_UI.classList.remove('hide');
        is_ARmode = true;
    }/**---if exits the ar mode or not presenting--- */
    else if (arStatus === 'not-presenting') {
        //console.log('AR mode ended');
        dimElements.forEach((element) => {
            element.classList.add('hide');
        });
        checkboxui.classList.add('hide');
        checkbox.classList.add('hide');
        checkboxui_bg.classList.add('hide');
        scale_per_UI.classList.add('hide');
        mr_sampler.setScale({ u: default_tilling, v: default_tilling });
        nor_sampler.setScale({ u: default_tilling, v: default_tilling });
        oc_sampler.setScale({ u: default_tilling, v: default_tilling });
        is_ARmode = false;
        // till_uv_maps(nor_sampler.scale.u, scale.x);
    }
    else if (arStatus === 'failed') {
        //console.log('AR mode ended');
        dimElements.forEach((element) => {
            element.classList.add('hide');
        });
        checkboxui.classList.add('hide');
        checkbox.classList.add('hide');
        checkboxui_bg.classList.add('hide');
        scale_per_UI.classList.add('hide');
    }
});

/**|--------------------------------------------------------------------|
 * |-----------------------updating svg lines---------------------------|
 * |--------------------------------------------------------------------|*/
function drawLine(svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) {
    if (dotHotspot1 && dotHotspot2) {
        svgLine.setAttribute('x1', dotHotspot1.canvasPosition.x);
        svgLine.setAttribute('y1', dotHotspot1.canvasPosition.y);
        svgLine.setAttribute('x2', dotHotspot2.canvasPosition.x);
        svgLine.setAttribute('y2', dotHotspot2.canvasPosition.y);

        if (dimensionHotspot && !dimensionHotspot.facingCamera) {
            svgLine.classList.add('hide');
        }
        else {
            svgLine.classList.remove('hide');
        }
    }
}

const dimLines = modelViewer.querySelectorAll('line');
/**|--------------------------------------------------------------|
 * |------here svg line is getting drawn--------------------------|
 * |--------------------------------------------------------------|
 */
const renderSVG = () => {
    drawLine(dimLines[0], modelViewer.queryHotspot('hotspot-dot+X-Y+Z'), modelViewer.queryHotspot('hotspot-dot+X-Y-Z'), modelViewer.queryHotspot('hotspot-dim+X-Y'));
    // drawLine(dimLines[1], modelViewer.queryHotspot('hotspot-dot+X-Y-Z'), modelViewer.queryHotspot('hotspot-dot+X+Y-Z'), modelViewer.queryHotspot('hotspot-dim+X-Z'));
    drawLine(dimLines[2], modelViewer.queryHotspot('hotspot-dot+X+Y-Z'), modelViewer.queryHotspot('hotspot-dot-X+Y-Z')); // always visible
    //drawLine(dimLines[3], modelViewer.queryHotspot('hotspot-dot-X+Y-Z'), modelViewer.queryHotspot('hotspot-dot-X-Y-Z'), modelViewer.queryHotspot('hotspot-dim-X-Z'));
    drawLine(dimLines[4], modelViewer.queryHotspot('hotspot-dot-X-Y-Z'), modelViewer.queryHotspot('hotspot-dot-X-Y+Z'), modelViewer.queryHotspot('hotspot-dim-X-Y'));
};

/**|-----------------------------------------------------------|
*--|----------This function handles the dimension ui-----------|
*--|-----------------------------------------------------------|*/
function dimension_calculation() {
    const center = modelViewer.getBoundingBoxCenter();
    const size = modelViewer.getDimensions();
    const x2 = size.x / 2;
    const y2 = size.y / 2;
    const z2 = size.z / 2;

    temp_val_width = cal_scale_AR_mode(size.z, temp_percentage);
    temp_val_length = cal_scale_AR_mode(size.x, temp_percentage);
    //console.log('updated size width: ', temp_val_width);
    //console.log('updated size length: ', temp_val_length);
    if (is_ARmode === true) {
        if (size_para_format === "ft") {
            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y+Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z + z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Y',
                position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Y"]').textContent =
                `${(temp_val_width * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y-Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z - z2}`
            });

            //console.log('updated size width: ', temp_val_width * 3.280839895, 'ft');
            //console.log('updated size length: ', temp_val_length * 3.280839895, 'ft');

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Z',
                position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Z"]').textContent =
                `${(size.y * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X+Y-Z',
                position: `${center.x + x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+Y-Z',
                position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+Y-Z"]').textContent =
                `${(temp_val_length * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X+Y-Z',
                position: `${center.x - x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Z',
                position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Z"]').textContent =
                `${(size.y * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y-Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Y',
                position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Y"]').textContent =
                `${(temp_val_width * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y+Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`
            });
        }
        if (size_para_format === "cm") {
            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y+Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z + z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Y',
                position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Y"]').textContent =
                `${(temp_val_width * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y-Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z - z2}`
            });

            //console.log('updated size width: ', temp_val_width * 100, 'cm');
            //console.log('updated size length: ', temp_val_length * 100, 'cm');

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Z',
                position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Z"]').textContent =
                `${(size.y * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X+Y-Z',
                position: `${center.x + x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+Y-Z',
                position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+Y-Z"]').textContent =
                `${(temp_val_length * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X+Y-Z',
                position: `${center.x - x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Z',
                position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Z"]').textContent =
                `${(size.y * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y-Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Y',
                position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Y"]').textContent =
                `${(temp_val_width * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y+Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`
            });
        }
    }
    else if (is_ARmode === false) {
        //console.log('updated size in non ar: ');
        if (size_para_format === "ft") {
            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y+Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z + z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Y',
                position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Y"]').textContent =
                `${(size.z * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y-Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Z',
                position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Z"]').textContent =
                `${(size.y * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X+Y-Z',
                position: `${center.x + x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+Y-Z',
                position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+Y-Z"]').textContent =
                `${(size.x * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X+Y-Z',
                position: `${center.x - x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Z',
                position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Z"]').textContent =
                `${(size.y * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y-Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Y',
                position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Y"]').textContent =
                `${(size.z * 3.280839895).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y+Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`
            });
        }
        if (size_para_format === "cm") {
            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y+Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z + z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Y',
                position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Y"]').textContent =
                `${(size.z * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X-Y-Z',
                position: `${center.x + x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+X-Z',
                position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+X-Z"]').textContent =
                `${(size.y * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot+X+Y-Z',
                position: `${center.x + x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim+Y-Z',
                position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim+Y-Z"]').textContent =
                `${(size.x * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X+Y-Z',
                position: `${center.x - x2} ${center.y + y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Z',
                position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Z"]').textContent =
                `${(size.y * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y-Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z - z2}`
            });

            modelViewer.updateHotspot({
                name: 'hotspot-dim-X-Y',
                position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`
            });
            modelViewer.querySelector('button[slot="hotspot-dim-X-Y"]').textContent =
                `${(size.z * 100).toFixed(0)} ${size_para_format}`;

            modelViewer.updateHotspot({
                name: 'hotspot-dot-X-Y+Z',
                position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`
            });
        }
    }
}

/**|---------------------------------------------------------------------------------------|
 * |------Here onload event (when loads for thew first time) truning the check box---------|
 * |------ui off and calculating dimension and rendering the svg line's--------------------|
 * |---------------------------------------------------------------------------------------|
 */
modelViewer.addEventListener('load', () => {


});
/**|----------------------------------------------------------|
 * |--this function shows the progress of the scene when------|
 * |--first load and when model changed-----------------------|
 * |----------------------------------------------------------|
 */
function load() {
    const onProgress = (event) => {
        const progressBar = event.target.querySelector('.progress-bar');
        const updatingBar = event.target.querySelector('.update-bar');
        updatingBar.style.width = `${event.detail.totalProgress * 100}%`;
        if (event.detail.totalProgress === 1) {
            setTimeout(() => {
                progressBar.classList.add('hide');
                event.target.removeEventListener('progress', onProgress);
            }, 500);

        } else {
            progressBar.classList.remove('hide');
        }
    };
    document.querySelector('model-viewer').addEventListener('progress', onProgress);
}

/**|-------------------------------------------------------------------------------|
 * |--Here we initialize and set everything when scene loads first time------------|
 * |--such as getting data from url, getting texture and setting it to the model---|
 * |--,getting and setting the size of the rug and etc-----------------------------|
 * |-------------------------------------------------------------------------------|*/
document.addEventListener('DOMContentLoaded', () => {
    const modelViewerTexture1 = document.querySelector("#model");

    modelViewerTexture1.addEventListener("load", async () => {
        /**|-----------------------------------------------| 
        *--|----get data from URL--------------------------|
        *--|-----------------------------------------------| */
        /**------------------------------------------------------------------------------------*/
        load();
        /**------------------------------------------------------------------------------------*/
        // Example URL with encoded fragment
        //const url = 'https://example.com/page#data=value%201&shape=value%202';
        // document.querySelector("#model").model.materials[0].normalTexture.texture.sampler.setScale({ u: 6, v: 6 });

        modelViewerTexture1.scale = `${1} ${1} ${1}`;

        const totalSteps = 6; // Number of steps for progress tracking
        let currentStep = 0;

        dimElements.forEach((element) => {
            element.classList.remove('hide');
        });
        //checkboxui_bg.classList.add('hide');
        //checkboxui.classList.add('hide');
        //checkbox.classList.add('hide');
        //scale_per_UI.classList.add('hide');

        const currentUrl = window.location.href;
        const urlObject = new URL(currentUrl);
        const fragment = urlObject.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const param1 = params.get('data');
        const svgTextureUrl = param1.toString();
        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        const shape_param = params.get('shape'); // Decodes 'value%202' to 'value 2'
        const size = params.get('size').toString();
        const with_size = parseFloat(params.get('width'));
        const length_size = parseFloat(params.get('length'));
        const rug_Type = params.get('rug_type').toString();
        const material_Type = params.get('material_type').toString();
        const textureUrl = await loadImageAsTexture(svgTextureUrl);
        //console.log("Getting the params: ", shape_param, ' ', size, ' ', with_size, ' ', length_size, ' ', rug_Type, ' ', material_Type);

        change_Rug_Shape(shape_param, modelViewerTexture1);

        /**|------------------------------------------------------------------------------------|*/
        /**|------------------------------------------------------------------------------------|*/

        // URL of the new texture/
        const newTextureUrl = param1.toString();

        try {

            /** Ensuring the model is fully loaded*/
            const model = modelViewerTexture1.model;
            if (!model) {
                console.error('Model not found');
                return;
            }

            /** appling the texture to the first and second material*/
            const material = model.materials[0];
            const back_material = model.materials[1];
            if (!material) {
                console.error('Material not found');
                return;
            }
            if (!back_material) {
                console.error('Material not found');
                return;
            }
            console.log('Device Type:', getDeviceType());
            updateProgress(++currentStep,totalSteps);
            nor_m_texture=await createTiledTexture("Defalut_Maps/wool/bb.png", 3, 3);
            updateProgress(++currentStep,totalSteps);
            mr_m_texture=await createTiledTexture("Defalut_Maps/wool/SpecularMap.png", 3, 3);
            updateProgress(++currentStep,totalSteps);
            ocm_m_texture=await createTiledTexture("Defalut_Maps/wool/Wool_oc_n.png", 3, 3); 
            /**|--------------------------------------------------------------------|
             *-|---Main texure maps (Base, Normal, Rougthness and Occlusion maps)---|
             *-|--------------------------------------------------------------------|*/
             updateProgress(++currentStep,totalSteps);
            await get_set_MainTexture(rug_Type, material_Type, modelViewerTexture1, material, newTextureUrl,nor_m_texture, mr_m_texture, ocm_m_texture);

            /**|---------------------------------------------------------------------------|
             *-|------Back texture maps (Base, Normal, Roughtness and Occlusion maps)------|
             *-|---------------------------------------------------------------------------|*/
             updateProgress(++currentStep,totalSteps);
            await get_set_backTexture(rug_Type, modelViewerTexture1, back_material, newTextureUrl, shape_param)

        } catch (error) {
            console.error('An error occurred while applying the texture:', error);
        }
        /**|---------------------------------------------------------------|
         * |-----Changing scale of the rug accourding to the---------------| 
         * |-----input got from the user (which is comming from the url)---|
         * |---------------------------------------------------------------|*/
        updateProgress(++currentStep,totalSteps);
        await scale_change(size, with_size, length_size, rugType);

        dimension_calculation();
        renderSVG();

        /**|----------------------------------------------------------------|
             *-|----this will force scene viewer to directly open in AR Mode----|
             *-|----------------------------------------------------------------|*/
        //modelViewerTexture1.activateAR();

    });
});
modelViewer1.addEventListener('camera-change', renderSVG);

/**|-----------------------------------------------------------|
*--|--can get the scene elements by using cgetscene function,--|
*--|--this is a custom function created for the internal use---|
*|NOTE|--Before using it chech the hierarchy of the scene------|
*--|-----------------------------------------------------------|*/
//console.log("scene test: ",modelViewer.cgetscene);

/**|----------------------------------------------------------------|
 * |--------------------List of features done-----------------------|
 * |----------------------------------------------------------------|
 * |1|--Displaying Rug model in 3d scene anad AR mode---------------|
 * |2|--Getting data from user using URL (getting URL from QR)------|
 * |3|--Getting, changing and applying the main texture of the rug--|
 * |4|--Getting, changing and applying the scale and dimension of---|
 * --|--the rug-----------------------------------------------------|
 * |5|--Calculation and visualization of the dimension of the rug---|
 * |6|--Calculation of the texture tilling according to the scale---|
 * --|--of the rug to preserve the texture effect quality-----------|
 * |7|--Real-time texture tilling in the AR mode when user scale's--|
 * --|--the rug to preserve the texture effect quality--------------|
 * |8|--Silk and Wool material (effects)----------------------------|
 * |9|--Rug shape change according to the user input (URL)----------|
 * |10|-Hand tufted and hand knotted back texture added for all-----|
 * ---|-the rug shapes----------------------------------------------|
 * |11|-Added all the parameters image, shape, size, width, height,-|
 * ---|-rug_type and material_type----------------------------------|
 * |----------------------------------------------------------------|
 * |----------------------------------------------------------------|
 */







