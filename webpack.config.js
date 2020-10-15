/*eslint-env es6*/
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: [
    './src/index.js',
  ],
  output: {
    filename: './main.js',
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        use: {
          loader: 'babel-loader',
        },
      },   
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
    new CopyWebpackPlugin(
      { 
        patterns: [      
          { from: path.resolve(__dirname,'bootstrap/css/bootstrap.min.css'), to: 'bootstrap/css/bootstrap.min.css' },          
        ]
      }
    )
  ]  
};