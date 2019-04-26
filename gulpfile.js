const gulp = require('gulp');
let concat = require('gulp-concat');
let rename = require('gulp-rename');
let uglify = require('gulp-uglify');

//Fusionner tous les fichiers JS car on ne peut pas importer de scrips dans un Web Worker à cause de "MIME error is not application/javascript"
function con(){
  let jsFiles = [
      './src/js/workers/*.js',
      './src/js/models/*.js',
      './src/js/utils/*.js'
    ],
    jsDest = './src/js/dist/';

  return gulp.src(jsFiles)
    .pipe(concat('all-in-one-worker.js'))
    .pipe(gulp.dest(jsDest));
}

exports.con = con;

/*
gulp.task('script', function() {
  return gulp.src(jsFiles)
    .pipe(concat('all-in-one-worker.js'))
    .pipe(gulp.dest(jsDest));
});
//*/