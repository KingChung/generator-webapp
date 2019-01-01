// generated on <%= date %> using <%= name %> <%= version %>
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync').create();
const del = require('del');
const autoprefixer = require('autoprefixer');
const cssnano = require('gulp-cssnano');
const { argv } = require('yargs');

const $ = gulpLoadPlugins({
  rename: {
    'gulp-rev-rewrite': 'revRewrite',
    'gulp-rev-delete-original': 'revDelete'
  }
});
const reload = browserSync.reload;

let dev = true;
const port = argv.port || 9000;

gulp.task('styles', () => {<% if (includeSass) { %>
  return gulp.src('app/styles/*.scss')
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))<% } else { %>
  return gulp.src('app/styles/*.css')
    .pipe($.if(dev, $.sourcemaps.init()))<% } %>
    .pipe($.postcss([
      autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']})
    ]))
    .pipe($.if(dev, $.sourcemaps.write()))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

<% if (includeBabel) { -%>
gulp.task('scripts', () => {
  return gulp.src('app/scripts/**/*.js')
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(dev, $.sourcemaps.write('.')))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(reload({stream: true}));
});
<% } -%>

function lint(files) {
  return gulp.src(files)
    .pipe($.eslint({ fix: true }))
    .pipe(reload({stream: true, once: true}))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
}

gulp.task('lint', () => {
  return lint('app/scripts/**/*.js')
    .pipe(gulp.dest('app/scripts'));
});
gulp.task('lint:test', () => {
  return lint('test/spec/**/*.js')
    .pipe(gulp.dest('test/spec'));
});

<% if (includeBabel) { -%>
gulp.task('html', gulp.series(gulp.parallel('styles', 'scripts'), () => {
<% } else { -%>
gulp.task('html', gulp.series('styles', () => {
<% } -%>
  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if(/\.js$/, $.uglify({compress: {drop_console: true}})))
    .pipe($.if(/\.css$/, $.cssnano({safe: true, autoprefixer: false})))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: {compress: {drop_console: true}},
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    <% if (ossRoot) { -%>
    .pipe($.replace(/\.\/assets\//g, _ => `<%= ossRoot %>/assets/`))
    .pipe($.replace(/\.\/images\//g, _ => `<%= ossRoot %>/images/`))
    .pipe($.replace(/\/bower_components\//g, _ => `<%= ossRoot %>/bower_components/`))
    .pipe($.replace(/\/vendors\//g, _ => `<%= ossRoot %>/vendors/`))
    <% } -%>
    .pipe(gulp.dest('dist'));
}));

gulp.task('assets', () => {
  return gulp.src('app/assets/**/*')
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest('dist/assets'));
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', () => {
  return gulp.src('app/fonts/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe($.if(dev, gulp.dest('.tmp/fonts'), gulp.dest('dist/fonts')));
});

gulp.task('extras', () => {
  return gulp.src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('revision', () => {
  return gulp.src('dist/**/*.{css,js}')
    .pipe($.rev())
    .pipe($.revDelete()) // Remove the unrevved files
    .pipe(gulp.dest('dist'))
    .pipe($.rev.manifest())
    .pipe(gulp.dest('dist'));
});

gulp.task('revRewrite', gulp.series('revision', function() {
    const manifest = gulp.src('dist/rev-manifest.json');
    return gulp.src('dist/*.html')
      .pipe($.revRewrite({ manifest }))
      .pipe(gulp.dest('dist'));
}));

function calcSize(){
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true})); 
}

gulp.task('build', gulp.series(gulp.parallel('lint', 'html', 'images', 'assets', 'fonts', 'extras'), calcSize));

gulp.task('default', gulp.series('clean', 'build', 'revRewrite'))

gulp.task('serve', gulp.series(gulp.parallel('styles'<% if (includeBabel) { %>, 'scripts'<% } %>, 'fonts'), 'clean', () => {
    browserSync.init({
      notify: false,
      port,
      server: {
        baseDir: ['.tmp', 'app'],
        routes: {
          '/node_modules': 'node_modules'
        }
      }
    });

    gulp.watch([
      'app/*.html',
<% if (!includeBabel) { -%>
      'app/scripts/**/*.js',
<% } -%>
      'app/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', reload);

    gulp.watch('app/styles/**/*.<%= includeSass ? 'scss' : 'css' %>', gulp.series('styles'));
<% if (includeBabel) { -%>
    gulp.watch('app/scripts/**/*.js', gulp.series('scripts'));
<% } -%>
    gulp.watch('app/fonts/**/*', gulp.series('fonts'));
}));

gulp.task('serve:dist', gulp.series('default', () => {
  browserSync.init({
    notify: false,
    port,
    server: {
      baseDir: ['dist'],
        routes: {
          '/node_modules': 'node_modules',
          '/vendors': 'vendors'
        }
    }
  });
}));

gulp.task('serve:test', gulp.series('scripts', () => {
  browserSync.init({
    notify: false,
    port,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
<% if (includeBabel) { -%>
        '/scripts': '.tmp/scripts',
<% } else { -%>
        '/scripts': 'app/scripts',
<% } -%>
        '/node_modules': 'node_modules',
        '/vendors': 'vendors'
      }
    }
  });

<% if (includeBabel) { -%>
  gulp.watch('app/scripts/**/*.js', gulp.series('scripts'));
<% } -%>
  gulp.watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
  gulp.watch('test/spec/**/*.js', gulp.series('lint:test'));
}));