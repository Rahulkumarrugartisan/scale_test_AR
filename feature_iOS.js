
function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Detect iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'iOS';
    }

    // Detect Android
    if (/android/i.test(userAgent)) {
      return 'Android';
    }

    // Detect Windows
    if (/windows/i.test(userAgent)) {
      return 'Windows';
    }

    // Detect MacOS
    if (/Macintosh|Mac OS X/i.test(userAgent)) {
      return 'Mac';
    }

    // Detect Linux
    if (/Linux/.test(userAgent)) {
      return 'Linux';
    }

    // Default to Desktop
    return 'Desktop';
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        script.async = true;
        
        script.onload = () => {
            console.log(`Script loaded: ${url}`);
            resolve();
        };

        script.onerror = () => {
            console.error(`Failed to load script: ${url}`);
            reject();
        };

        document.head.appendChild(script);
    });
}

  // Example usage
  const deviceType = getDeviceType();
  console.log('Running on:', deviceType);

  // Change script according to device
  if (deviceType === 'iOS') {
    // Load specific script for iOS
    const modelViewerTexture1 = document.querySelector("model-viewer");

    modelViewerTexture1.addEventListener("load", () => {

      const material = modelViewerTexture1.model.materials[0];

      const createAndApplyTexture = async (channel, event) => {
        const texture = await modelViewerTexture1.createTexture(event.target.value);
        if (channel.includes('base') || channel.includes('metallic')) {
          material.pbrMetallicRoughness[channel].setTexture(texture);
        } else {
          material[channel].setTexture(texture);
        }
        if(channel==='normalTexture'){
        const tilled_texture = material[channel].texture.sampler;
        tilled_texture.setScale({ u: 3, v: 3 });
        }
      }

      document.querySelector('#diffuse').addEventListener('input', (event) => {
        createAndApplyTexture('baseColorTexture', event);
      });

      document.querySelector('#normals').addEventListener('input', (event) => {
        createAndApplyTexture('normalTexture', event);
      });
    });

  } else {
    // Load default script for other platforms
    loadScript('feature.js').then(() => {
        console.log('Desktop script loaded');
    }).catch(() => {
        console.error('Failed to load desktop script');
    });
  }

 