const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        plugin: './js/index.js'
    },
    experiments: {
        topLevelAwait: true,
        outputModule: true
    },
    mode: 'development',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'module',
        publicPath: 'auto',
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
        ],
    },
    resolve: {
        alias: {
            indexScript: './js/index.js'
        }
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: `./js/descriptor.json`, to: './' },
            ]
        }),
    ]
};