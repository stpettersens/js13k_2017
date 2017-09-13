'use strict'

const gulp = require('gulp')
const babel = require('gulp-babel')
const insert = require('gulp-insert')
const replace = require('gulp-replace')
const rename = require('gulp-rename')
const jsmin = require('gulp-jsmin')
const jsdoc = require('gulp-jsdoc3')
const dos2unix = require('gulp-dos2unix-js')
const clean = require('gulp-rimraf')
const standard = require('gulp-standard')
const sequence = require('gulp-sequence')
const trimLines = require('gulp-remove-empty-lines')
const chalk = require('chalk')
const sh = require('shelljs')
const fs = require('fs')

const notice = ['/* @stpettersens\' js13k 2017 entry.', 'Blackjack in under 13kb.',
  'Copyright 2017 Sam Saint-Pettersen. ', 'MIT License. */', '\n']

const zip = '7z u -tzip ../stpettersens_js13k.zip *.html js/*.js README.md LICENSE'

gulp.task('standard', function () {
  return gulp.src('*.js')
  .pipe(standard())
  .pipe(standard.reporter('default', {
    breakOnError: true
  }))
})

gulp.task('js', function () {
  return gulp.src('js13k.js')
  .pipe(replace(/const DEBUG = true/, 'const DEBUG = false'))
  .pipe(babel({presets: ['es2015']}))
  .pipe(rename({suffix: '.min'}))
  .pipe(jsmin()) // Be on the safe side with the symbols.
  .pipe(trimLines())
  .pipe(insert.prepend(notice.join('\n')))
  .pipe(gulp.dest('js'))
})

gulp.task('minified-html', function () {
  return gulp.src('index.html')
  .pipe(replace(/js13k\.js/, 'js/js13k.min.js'))
  .pipe(gulp.dest('.'))
})

gulp.task('test-html', function () {
  return gulp.src('index.html')
  .pipe(replace(/js\/js13k\.min\.js/, 'js13k.js'))
  .pipe(gulp.dest('.'))
})

gulp.task('clean', function () {
  return gulp.src(['docs', 'js/js13k.min.js'], {read: false})
  .pipe(clean())
})

gulp.task('doc', function () {
  return gulp.src(['README.md', 'js13k.js'], {read: false})
  .pipe(jsdoc())
})

gulp.task('default', sequence('standard', 'js'))

gulp.task('deploy', sequence('default', 'minified-html'))

gulp.task('stage-zip-a', ['default', 'minified-html'], function () {
  return gulp.src(['index.html', 'README.md', 'LICENSE'])
  .pipe(dos2unix())
  .pipe(gulp.dest('archive'))
})

gulp.task('stage-zip-b', ['stage-zip-a'], function () {
  return gulp.src('js/js13k.min.js')
  .pipe(gulp.dest('archive/js'))
})

gulp.task('zip', ['stage-zip-b'], function () {
  process.chdir('archive')
  sh.exec(zip)
  process.chdir('..')
})

gulp.task('clean-arch', function () {
  return gulp.src('archive', {read: false})
  .pipe(clean())
})

gulp.task('check-13k', function () {
  const archive = fs.lstatSync('stpettersens_js13k.zip').size
  const src = fs.lstatSync('js13k.js').size
  const minified = fs.lstatSync('js/js13k.min.js').size
  console.log('Archive (zip) size = ' + archive)
  console.log('Source (raw) = ' + src)
  console.log('Minified source = ' + minified)
  if (archive < 13312) { // Because 13x1024.
    console.log(chalk.green('Less than 13312 bytes (13k) - OKAY :)'))
  } else {
    console.log(chalk.bold.red('Too big. Try harder!'))
    process.exit(-1)
  }
})

gulp.task('archive', sequence('minified-html', 'zip', 'check-13k',
  'clean-arch', 'test-html'))
