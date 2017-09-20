const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const merge = require('merge');
const cleanCSS = require('clean-css');
var appRoot = require('app-root-path');

module.exports = function (options) {
    if (!(options && options.coverageDir))
        throw new Error('coverageDir param is required');

    const defaultOpts = {
        coverageDir: './',
        pattern: '/**/*.html',
        fileEncoding: 'utf8',
        extraCss: '',
        minifyOptions: {

        }
    }

    let appRootPath = appRoot.path;

    let opts = merge(defaultOpts, options);
    let root = path.resolve(appRootPath, opts.coverageDir);
    let globPattern = root + opts.pattern;
    // console.log(globPattern);

    glob(globPattern, (err, files) => {
        if (err) {
            throw new Error(err);
        }

        let fileCache = {};

        if (opts.extraCss) {
            opts.extraCss = new cleanCSS(opts.minifyOptions).minify(opts.extraCss).styles;
        }

        files.forEach((file) => {
            fs.readFile(file, opts.fileEncoding, (fileErr, data) => {
                const $ = cheerio.load(data);
                $('link[rel="stylesheet"]').each(function (idx, elem) {
                    let jElem = $(elem);
                    let href = jElem.attr('href');
                    var resolvedHref = path.resolve(path.dirname(file), href);
                    if (!fileCache[resolvedHref]) {
                        let cssContent = fs.readFileSync(resolvedHref, opts.fileEncoding);
                        fileCache[resolvedHref] = new cleanCSS(opts.minifyOptions).minify(cssContent).styles;
                    }

                    $('<style/>').html(fileCache[resolvedHref]).insertAfter(jElem);
                    jElem.remove();
                });

                if (opts.extraCss) {
                    var customCssObj = $('<style/>').html(opts.extraCss);
                    $('head').append(customCssObj);
                }

                fs.writeFile(file, $.html(), () => {
                    // console.log(file + ' written');
                });
            });
        });
    });
}
