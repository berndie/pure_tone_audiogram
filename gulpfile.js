const gulp = require("gulp");
const concat = require("gulp-concat")
const map = require("vinyl-map");
const uglifyjs = require('uglify-es');
const composer = require('gulp-uglify/composer');
const rename = require("gulp-rename");
const clean = require("gulp-clean");
const pump = require('pump');

const minify = composer(uglifyjs, console);


function scriptToModule(cb) {
  let moduleToScript = map(function(code, filename){
    code = code.toString();
    return code+"\nexport default Audiogram";
  })
  return gulp.src(['src/audiogram.js'])
    .pipe(moduleToScript)
    .pipe(rename('audiogram.mjs'))
    .pipe(gulp.dest('dist'))
}

function minifyScript(cb) {
  const options = {};
  pump([
      gulp.src(['src/audiogram.js']),
      rename('audiogram.min.js'),
      minify(options),
      gulp.dest('dist')
    ],
    cb
  );
}


function minifyScriptWithD3(cb) {
  const options = {};

  pump([
      gulp.src(['vendor/d3.v3.min.js', 'src/audiogram.js']),
      concat('audiogram_d3.min.js'),
      minify(options),
      gulp.dest('dist')
    ],
    cb
  );
}

function minifyModule(cb) {
  const options = {};

  pump([
      gulp.src(['dist/audiogram.mjs']),
      rename('audiogram.min.mjs'),
      minify(options),
      gulp.dest('dist')
    ],
    cb
  );
}


function minifyModuleWithD3(cb) {
  const options = {};

  pump([
      gulp.src(['vendor/d3.v3.min.js', 'dist/audiogram.mjs']),
      concat('audiogram_d3.min.mjs'),
      minify(options),
      gulp.dest('dist')
    ],
    cb
  );
}

function copySource(cb){
    return gulp.src(['src/audiogram.js'])
      .pipe(gulp.dest("dist"))
}

function cleanDist(cb){
  return gulp.src("dist", {read: false}).pipe(clean());
}

exports.build = gulp.parallel(gulp.series(scriptToModule, gulp.parallel(minifyModule, minifyModuleWithD3)), minifyScript, minifyScriptWithD3, copySource)
exports.clean = gulp.series(cleanDist)