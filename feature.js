/**----------------------------------------------------------------------------------------------------------|
*-|--This script is developed by Rahul kumar for Rug Artisan Ltd---------------------------------------------|
* ___________________________________________________________________________________________________________
*|___________________________________________________________________________________________________________|
*
*-|This script handles all the freature in the AR web viewer (such as texture change, material change,-------| 
* size calculation and change...etc)-------------------------------------------------------------------------| 
* ___________________________________________________________________________________________________________
*|___________________________________________________________________________________________________________|
*
*-|NOTE|There are custom changes in the model Viewer API which is included in the project, if provided-------|
-------|reference of the external model viewer API it will break the code if anyone planning to change the---|
-------|code please be sure what you are doing...(happy coding)----------------------------------------------|
*---------------------------------------------------------------------------------------------------------- */

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

async function loadImageAsTexture(url) {
    const response = await fetchWithExponentialBackoff(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Prepare to read the response as a stream
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || 0;
    let receivedLength = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress bar
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
            // Indeterminate progress

            console.log("loading...: ");
        }

    }

    // Combine chunks into a single Uint8Array
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    // Create a Blob from the combined chunks
    const blob = new Blob([chunksAll]);
    const fileExtension = url.split('.').pop().toLowerCase();

    // Check for image type based on file signature
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

    console.log('Detected image type:', imgType || 'unknown');

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

function change_Rug_Shape(shapename, model) {
    //console.log("shape name: " + shapename);
    if (shapename === "rectangle") {
        model.src = "rug_Models/rect.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "round") {
        model.src = "rug_Models/round.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "oval") {
        model.src = "rug_Models/oval.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "hexagon") {
        model.src = "rug_Models/hexagon.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "halfmoon") {
        model.src = "rug_Models/halfmoon.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "diamond") {
        model.src = "rug_Models/diamond.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "eight") {
        model.src = "rug_Models/eight.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "drop") {
        model.src = "rug_Models/drop.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "oblong") {
        model.src = "rug_Models/oblong.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "arch") {
        model.src = "rug_Models/arch.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "runner") {
        model.src = "rug_Models/runner.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "ogee") {
        model.src = "rug_Models/ogee.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "square") {
        model.src = "rug_Models/square.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "splash") {
        model.src = "rug_Models/splash.glb";
        console.log("shape changed to: " + shapename);
    }
    if (shapename === "capsule") {
        model.src = "rug_Models/capsule.glb";
        console.log("shape changed to: " + shapename);
    }

}

/**-----TO DO-----
 * --Set scale and size of the rug according to the data fetched from the URL--
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
 * -----|---future reference-------------------------------------------------|
 * ------------------------------------------------------------------------------
 */

let size_para_format = 'cm';

function set_rug_scale_size(parameter, width, length, defualtRug_widht, defaultRug_length, modelViewer) {

    let updated_width = 0;
    let updated_length = 0;

    /**if parameter is ft the width amd length is always in inches
     * if parameter is cm then its cm
     */
    if (parameter === "ft") {
        console.log("inside ft");
        /**converting the size in inches */
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
        console.log("inside cm");
        /**converting the size in cm */
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

    modelViewer.scale = `${updated_length} ${1} ${updated_width}`;

}

function claculate_scale_percentage(val, default_val) {

    return (val / default_val) * 100;;
}

function get_updated_scale_value(percentage) {


    const new_val = (percentage * 1) / 100;

    return new_val;
}

const modelViewer1 = document.querySelector("#model");

async function scale_change(parameter, user_width, user_length) {

    if (modelViewer1.loaded) {
        console.log("Model is getting updated ");
        set_rug_scale_size(parameter, user_width, user_length, modelViewer1.getDimensions().z, modelViewer1.getDimensions().x, modelViewer1)

        console.log("before delay");
        await delay(1);
        dimension_calculation();
        console.log("after delay");

        //modelViewer.scale= `${2} ${1} ${2}`;
        modelViewer1.updateFraming();
    }

}
/**-----------------------------------------------------------------------------------------------*/
/**real time scale calculation feature fro AR mode */
/**-----------------------------------------------------------------------------------------------*/
function cal_scale_AR_mode(model_width, scale_percentage) {
    const width_val = (scale_percentage * model_width) / 100;

    return width_val;
}
/**-----------------------------------------------------------------------------------------------*/
/**-----------------------------------------------------------------------------------------------*/

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

function texture_tilling(default_tilling, model_scale) {
    /**--|setp 1|--Need to calculate the default numner of the tilling in default scale--| */

    const tilling_val = default_tilling * model_scale;

    // Round to the nearest integer
    const tilling_val_temp = Math.round(tilling_val);

    // Ensure the tiling value is positive
    const _tilling_val = Math.max(tilling_val_temp, 1);

    return _tilling_val;

}

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

/**|-------------------------------------------------------------------------------|
 * |--Here we initialize and set everything when scene loads first time------------|
 * |--such as getting data from url, getting texture and setting it to the model---|
 * |--,getting and setting the size of the rug and etc-----------------------------|
 * |-------------------------------------------------------------------------------|*/

document.addEventListener('DOMContentLoaded', () => {
    const modelViewerTexture1 = document.querySelector("#model");

    modelViewerTexture1.addEventListener("load", async () => {
        //------------------------------------------------------------------------------------
        //** get data from URL */
        //------------------------------------------------------------------------------------
        // Example URL with encoded fragment
        //const url = 'https://example.com/page#data=value%201&shape=value%202';
        document.querySelector("#model").model.materials[0].normalTexture.texture.sampler.setScale({ u: 6, v: 6 });

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
        const textureUrl = await loadImageAsTexture(svgTextureUrl);
        console.log("Getting the params: ", shape_param, ' ', size, ' ', with_size, ' ', length_size);

        /**|---TO DO-----------------------------------------------------------------------|
        *--|---need to handle the exception if the URL is not having the full info---------|
        *--|---data,shape,size or etc.-----------------------------------------------------|
        *--|---if not provided it will show the default texture, material and size of------|
        *--|---of the rug------------------------------------------------------------------|
        *--|-------------------------------------------------------------------------------|*/


        //if (shape_param != null) {
        change_Rug_Shape(shape_param, modelViewerTexture1);
        //}
        //if (size != null && with_size != null && length_size != null) {
        scale_change(size, with_size, length_size);
        //}


        //------------------------------------------------------------------------------------
        //------------------------------------------------------------------------------------

        // URL of the new texture
        const newTextureUrl = param1.toString();

        try {
            // Ensure the model is fully loaded
            const model = modelViewerTexture1.model;
            if (!model) {
                console.error('Model not found');
                return;
            }

            // Assume you want to apply the texture to the first material
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

            // Create and apply the texture
            const texture = await modelViewerTexture1.createTexture(textureUrl);
            const normal_texture = await modelViewerTexture1.createTexture("Material_Texture/Carpet013_4K_Normal.jpg");
            const roughtness_texture = await modelViewerTexture1.createTexture("Material_Texture/fabrics_0078_roughness_1k.jpg");
            const oc_texture = await modelViewerTexture1.createTexture("Material_Texture/Carpet013_4K_Displacement1_oc.png");
            if (material.pbrMetallicRoughness) {
                material.pbrMetallicRoughness.setMetallicFactor(.25);
                material.pbrMetallicRoughness.setRoughnessFactor(1);
                material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                material.normalTexture.setTexture(normal_texture);
                material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_texture);
                material.occlusionTexture.setTexture(oc_texture);



                nor_sampler = material.normalTexture.texture.sampler;
                mr_sampler = material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;
                oc_sampler = material.occlusionTexture.texture.sampler;

                /**
                 * |--Need to create dynamic scale for the texture--|
                 * 
                 */
                //till_uv_maps(parseFloat(getXScale(modelViewerTexture1.scale.toString())));
                mr_sampler.setScale({ u: 6, v: 6 });
                nor_sampler.setScale({ u: 6, v: 6 });
                oc_sampler.setScale({ u: 6, v: 6 });


            } else {
                console.error('Material does not support pbrMetallicRoughness');
            }


            const backtexture = await modelViewerTexture1.createTexture('Back_texture/Fabric_Pattern_04_ambientocclusion.jpg');
            const normal_backtexture = await modelViewerTexture1.createTexture("Back_texture/Fabric_Pattern_04_normal.jpg");
            const roughtness_backtexture = await modelViewerTexture1.createTexture("Back_texture/Fabric_Pattern_04_metallic.jpg");
            //const oc_texture = await modelViewerTexture1.createTexture("Material_Texture/Carpet013_4K_Displacement1_oc.png");

            if (back_material.pbrMetallicRoughness) {
                back_material.pbrMetallicRoughness.baseColorTexture.setTexture(backtexture);
                back_material.normalTexture.setTexture(normal_backtexture);
                back_material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(roughtness_backtexture);
                //back_material.occlusionTexture.setTexture(oc_texture);

                const backTexture = back_material.pbrMetallicRoughness.baseColorTexture.texture.sampler;
                const nor_backsampler = back_material.normalTexture.texture.sampler;
                const mr_backsampler = back_material.pbrMetallicRoughness.metallicRoughnessTexture.texture.sampler;



                if (shape_param === "runner!") {
                    backTexture.setScale({ u: 2, v: 6 });
                    nor_backsampler.setScale({ u: 2, v: 6 });
                    mr_backsampler.setScale({ u: 2, v: 6 });

                } else {
                    backTexture.setScale({ u: 2, v: 2 });
                    nor_backsampler.setScale({ u: 2, v: 2 });
                    mr_backsampler.setScale({ u: 2, v: 2 });

                }

                //modelViewerTexture1.activateAR();

            } else {
                console.error('Material does not support pbrMetallicRoughness');
            }



        } catch (error) {
            console.error('An error occurred while applying the texture:', error);
        }
    });


});

//------------------------------------------------------------------------------------------------------
/**getting scene scale finally getting the scene scale in AR Mode */
//------------------------------------------------------------------------------------------------------
const modelViewer = document.querySelector('#model');
//const scaleDisplay = document.querySelector('#info');
let scale_temp = 0;
let temp_percentage = 0;
let temp_val_width = 0;
let temp_val_length = 0;
let is_ARmode = false;

function trackScale(scale, delay = 500) {
    let previousScale = null;
    let isScaling = false;
    let scaleTimeout = null;

    function checkScale() {
        const currentScale = scale;
        // Check if this is the first check
        if (previousScale === null) {
            previousScale = currentScale;
            return false;
        }

        // Check if the scale has changed
        if (currentScale !== previousScale) {
            // Scaling detected
            isScaling = true;

            // Clear any existing timeout
            clearTimeout(scaleTimeout);

            // Set a timeout to update the previous scale and reset the scaling status
            scaleTimeout = setTimeout(() => {
                previousScale = currentScale;
                isScaling = false;
            }, delay);
        } else {
            // No change in scale, consider scaling stopped
            isScaling = false;
        }

        // Update the previous scale
        previousScale = currentScale;

        return isScaling;
    }

    return checkScale;
}



const info_interaction = document.querySelector('#info');
// Call checkScale periodically, e.g., with a setInterval

setInterval(() => {
    //const isCurrentlyScaling = checkScale();
    const is_sacling = trackScale(modelViewer.cModelScale.x, 500);
    const is_sacling_check = is_sacling();
        info_interaction.textContent = `-------isScale: ${is_sacling_check}`;
        console.log('Is scaling: ',is_sacling_check);

}, 100);


function till_uv_maps(current_default_tilling, model_scale) {

    if (mr_sampler != null && mr_sampler != null && oc_sampler != null ) {

        console.log("texture got tilled: ", texture_tilling(current_default_tilling, model_scale));
        if (mr_sampler.scale.u.toString() != texture_tilling(current_default_tilling, model_scale)) {
           // mr_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale), v: texture_tilling(current_default_tilling, model_scale) });
            //nor_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale), v: texture_tilling(current_default_tilling, model_scale) });
           // oc_sampler.setScale({ u: texture_tilling(current_default_tilling, model_scale), v: texture_tilling(current_default_tilling, model_scale) });
            console.log("texture got tilled: ", texture_tilling(current_default_tilling, model_scale));

        }
    }
}

function updateScaleDisplay() {
    const scale = modelViewer.cModelScale;

    // console.log('get scale function test inner output: ', scale);
    if (scale) {
        const scalePercentage = (scale.x * 100).toFixed(0); // Assuming uniform scaling
        scale_temp = (scalePercentage - 100) / 100;
        temp_percentage = scalePercentage;

        modelViewer.querySelector('button[slot="hotspot-hand"]').textContent =
            `${scalePercentage}%`;

        dimension_calculation();
        //console.log("model scale in ar mode: ", scale.x ,"An current uv tilling: ",nor_sampler.scale.u)
        /**Dynamic texture UV tilling in AR Mode */
        if (is_ARmode) {
            till_uv_maps(nor_sampler.scale.u, scale.x);

        }
        
    }


}

modelViewer.addEventListener('interact-stopped', (event) => {

    console.log('User is scaling the scene in AR mode. Current scale:', event.detail.status);
    //const info_interaction = modelViewer.querySelector('#info');
    // scaleDisplay.textContent = `Scale: ${event.detail.status}%`;
    // Add any other actions you want to perform when scaling is detected
});

modelViewer.addEventListener('load', updateScaleDisplay);
modelViewer.addEventListener('camera-change', updateScaleDisplay);

//----------------------------------------------------------------------------------------------------------
/**Model size calculation and size UI update */
//----------------------------------------------------------------------------------------------------------
const checkboxui_bg = modelViewer.querySelector('#controls');
const checkbox = modelViewer.querySelector('#show-dimensions');

const dimElements = [...modelViewer.querySelectorAll('#size_ui'), modelViewer.querySelector('#dimLines')];
const checkboxui = modelViewer.querySelector('.check');

const scale_per_UI = modelViewer.querySelector('.hotspot');

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
});
//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------


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
    }
    else if (arStatus === 'not-presenting') {
        //console.log('AR mode ended');
        dimElements.forEach((element) => {
            element.classList.add('hide');
        });
        checkboxui.classList.add('hide');
        checkbox.classList.add('hide');
        checkboxui_bg.classList.add('hide');
        scale_per_UI.classList.add('hide');
        is_ARmode = false;
    }
    else if (arStatus === 'failed') {
        //console.log('AR mode ended');
        dimElements.forEach((element) => {
            element.classList.add('hide');
        });
        checkboxui.classList.add('hide');
        checkbox.classList.add('hide');
        checkboxui_bg.classList.add('hide');
        scale_per_UI, classList.add('hide');

    }
});

/**update svg lines */
function drawLine(svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) {
    if (dotHotspot1 && dotHotspot2) {
        svgLine.setAttribute('x1', dotHotspot1.canvasPosition.x);
        svgLine.setAttribute('y1', dotHotspot1.canvasPosition.y);
        svgLine.setAttribute('x2', dotHotspot2.canvasPosition.x);
        svgLine.setAttribute('y2', dotHotspot2.canvasPosition.y);

        // use provided optional hotspot to tie visibility of this svg line to
        if (dimensionHotspot && !dimensionHotspot.facingCamera) {
            svgLine.classList.add('hide');
        }
        else {
            svgLine.classList.remove('hide');
        }
    }
}

const dimLines = modelViewer.querySelectorAll('line');

const renderSVG = () => {
    drawLine(dimLines[0], modelViewer.queryHotspot('hotspot-dot+X-Y+Z'), modelViewer.queryHotspot('hotspot-dot+X-Y-Z'), modelViewer.queryHotspot('hotspot-dim+X-Y'));
    // drawLine(dimLines[1], modelViewer.queryHotspot('hotspot-dot+X-Y-Z'), modelViewer.queryHotspot('hotspot-dot+X+Y-Z'), modelViewer.queryHotspot('hotspot-dim+X-Z'));
    drawLine(dimLines[2], modelViewer.queryHotspot('hotspot-dot+X+Y-Z'), modelViewer.queryHotspot('hotspot-dot-X+Y-Z')); // always visible
    //drawLine(dimLines[3], modelViewer.queryHotspot('hotspot-dot-X+Y-Z'), modelViewer.queryHotspot('hotspot-dot-X-Y-Z'), modelViewer.queryHotspot('hotspot-dim-X-Z'));
    drawLine(dimLines[4], modelViewer.queryHotspot('hotspot-dot-X-Y-Z'), modelViewer.queryHotspot('hotspot-dot-X-Y+Z'), modelViewer.queryHotspot('hotspot-dim-X-Y'));
};

/**This function handles the dimenstion ui */

function dimension_calculation() {
    const center = modelViewer.getBoundingBoxCenter();
    const size = modelViewer.getDimensions();
    const x2 = size.x / 2;
    const y2 = size.y / 2;
    const z2 = size.z / 2;

    temp_val_width = cal_scale_AR_mode(size.z, temp_percentage);
    temp_val_length = cal_scale_AR_mode(size.x, temp_percentage);

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
        console.log('updated size in non ar: ');
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



modelViewer.addEventListener('load', () => {
    dimElements.forEach((element) => {
        element.classList.add('hide');
    });
    checkboxui_bg.classList.add('hide');
    checkboxui.classList.add('hide');
    checkbox.classList.add('hide');
    scale_per_UI.classList.add('hide');

    dimension_calculation();

    renderSVG();

    modelViewer.addEventListener('camera-change', renderSVG);


});

/**can get the scene elements by using cgetscene function, this is a custom function created for the use */
//console.log("scene test: ",modelViewer.cgetscene);









