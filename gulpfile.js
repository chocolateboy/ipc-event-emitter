const rm    = require('del')
const exec  = require('execa')
const gulp  = require('gulp')
const babel = require('gulp-babel')
const since = require('gulp-changed')
const mocha = require('gulp-mocha')
const _     = require('lodash')

const SRC = {
    example: 'examples/src/**/*.js',
    src:     'src/**/*.js',
    test:    'test/src/**/*.js'
}

const DEST = 'target'
const COMPILE_TASKS = []

for (let [ name, path ] of _.entries(SRC)) {
    let task = `compile:${name}`

    COMPILE_TASKS.push(task)

    gulp.task(task, () => {
        return gulp
            .src(path, { base: '.' })
            .pipe(since(DEST))
            .pipe(babel())
            .pipe(gulp.dest(DEST))
    })
}

gulp.task('mocha', () => {
    return gulp.src(`${DEST}/test/src/*.js`, { read: false })
        .pipe(mocha({ timeout: 8000 }))
})

function runExample () {
    return exec.stdout('node', [ `./${DEST}/examples/src/parent.js` ])
        .then(msg => console.log(msg))
}

gulp.task('clean', () => rm(DEST))

gulp.task('compile', gulp.parallel(...COMPILE_TASKS))
gulp.task('example', gulp.series('compile', runExample))
gulp.task('test', gulp.series('compile', 'mocha'))
gulp.task('default', gulp.task('test'))
