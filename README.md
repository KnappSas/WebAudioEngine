# WebAudioEngine
An Engine suitable for DAWs, supporting Web Audio Modules

## Clone & setup the project

```sh
git clone https://github.com/KnappSas/WebAudioEngine.git
cd WebAudioEngine
yarn install
```

The dependencies needed are pulled automatically.

After that you can run the server with

```sh
node server.js
```

Open http://localhost:8888/ in your browser and you should see the test client.

## Possible problems
It might be possible that you cannot directly run the test client, as the connection is not trusted (because of SharedArrayBuffer). For that you might need to create a self-signed certificate https://www.akadia.com/services/ssh_test_certificate.html 