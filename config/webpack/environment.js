const {environment} = require("@rails/webpacker");
const resolveConfig = require("./resolves");
const VueLoaderPlugin = require("vue-loader/lib/plugin");

const vue = require("./loaders/vue");
const typescript = require("./loaders/typescript");
const css = require("./loaders/css");

// Enable the default config
// environment.splitChunks();

environment.config.merge(resolveConfig);

environment.loaders.append("typescript", typescript);
environment.loaders.append("css", css);
environment.plugins.prepend("VueLoaderPlugin", new VueLoaderPlugin());
environment.loaders.prepend("vue", vue);
environment.config.set('output.globalObject', 'this');
module.exports = environment;
