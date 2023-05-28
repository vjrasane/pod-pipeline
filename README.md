# Google API

- goto https://console.cloud.google.com/
- select/create app
- enable drive API
- create oauth credentials
- download as json file, save to workdir as credentials.json
- add credentials user to test users
- when running for the first time, pipeline will request login with google account, login once with the above test user and credentials will be stored

# Connect to chrome with puppeteer

Add to shortcut properties:

--remote-debugging-port=9222

# Photoshop

- Add scripts to Adobe\Adobe Photoshop 2020\Presets\Scripts
- Record droplet for `mockup.jsx` and save as `photoshop/mockup.exe`
  - override save and set output file to `Temp\{doc name}-output{ext}`
- Record droplet for `multi-mockup.jsx` and save as `photoshop/multi-mockup.exe`
  - override save and set output file to `Temp\{doc name}-output{ext}`
