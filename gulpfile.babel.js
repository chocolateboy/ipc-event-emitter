import rm    from 'del'
import exec  from 'execa'
import gulp  from 'gulp'
import babel from 'gulp-babel'
import since from 'gulp-changed'
import mocha from 'gulp-mocha'

const SRC = {
    example: 'examples/src/**/*.js',
    src:     'src/**/*.js',
    test:    'test/src/**/*.js'
}

const DEST = 'target'
const COMPILE_TASKS = []

for (let [ name, path ] of Object.entries(SRC)) {
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
    return exec.stdout('node', [ './target/examples/src/parent.js' ])
        .then(::console.log)
}

gulp.task('clean', () => rm(DEST))

gulp.task('compile', gulp.parallel(...COMPILE_TASKS))
gulp.task('example', gulp.series('compile', runExample))
gulp.task('test', gulp.series('compile', 'mocha'))
gulp.task('default', gulp.task('test'))
