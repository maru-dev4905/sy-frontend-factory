// import -----------------------------------------------------------
import gulp from "gulp";
import nunjucksRender from "gulp-nunjucks-render";
import plumber from "gulp-plumber";
import data from "gulp-data";
import cached from "gulp-cached";
import fs from "fs";
import del from "del";
import ws from "gulp-webserver";
import path from "path";
import gulpSass from "gulp-sass";
import dartSass from "dart-sass";
import sourcemaps from "gulp-sourcemaps";
import minificss from "gulp-minify-css";
import autoprefixer from "autoprefixer";
import postCss from "gulp-postcss";
import rename from "gulp-rename";
import dependents from "gulp-dependents";
import bro from "gulp-bro";
import babelify from "babelify";
import minify from "gulp-minify";
import imagemin from "gulp-imagemin";
import jsonMinify from "gulp-json-minify";
import babel from "gulp-babel"

// routes -----------------------------------------------------------
const src = './src/pf';
const dist = './dist/pf';
const ass = '/assets';

// src 폴더의 경로 설정
const path_src = {
  html: src + '/html',
  css: src + ass + '/css',
  images: src + ass + '/images',
  coreJS: src + ass + '/js/core',
  customJS: src + ass + '/js/custom',
  video: src + ass + '/videos',
  plugin: src + ass + '/plugins',
  json: src + ass + '/json'
}

// 빌드될 dist 폴더의 경로 설정
const path_dist = {
  html: dist,
  css: dist + ass + '/css',
  images: dist + ass + '/images',
  coreJS: dist + ass + '/js/core',
  customJS: dist + ass + '/js/custom',
  video: dist + ass + '/videos',
  plugin: dist + ass + '/plugins',
  json: dist + ass + '/json'
};


// etc --------------------------------------------------------------
const onErrorHandler = (error) => console.log(error);  // plumber option (에러 발생 시 에러 로그 출력)


// task -------------------------------------------------------------

// html task
const html = () => {
  // 들여쓰기(Tab Indent) 조정을 위한 함수
  const manageEnvironment = (environment) => {
    environment.addFilter('tabIndent', (str, numOfIndents, firstLine) => {
      str = str.replace(/^(?=.)/gm, new Array(numOfIndents + 1).join('\t'));
      if (!firstLine) {
        str = str.replace(/^\s+/, "");
      }
      return str;
    });
  };

  // .json 파일 적용을 위한 변수
  const gnbJson = JSON.parse(fs.readFileSync(path_src.html + '/_templates/_json/_gnb.json'));
  const docsJson = JSON.parse(fs.readFileSync(path_src.html + '/_templates/_json/_docs.json'));
  const componentJson = JSON.parse(fs.readFileSync(path_src.html + '/_templates/_json/_components.json'));
  const gnbJson_all = {...gnbJson};
  const docsJson_all = {...docsJson};
  const componentJson_all = {...componentJson};

  const gnbDatafile = () => {
    return gnbJson_all;
  }
  const docsDatafile = () => {
    return docsJson_all;
  }
  const componentDatafile = () => {
    return componentJson_all;
  }

  // njk 빌드
  return gulp.src([
    path_src.html + '/**/*',                           // 빌드할 njk 파일 경로
    '!' + path_src.html + '/**/_*',                    // 경로 중 제외할 njk 파일(빌드 때 병합될 파일)
    '!' + path_src.html + '/**/_*/**/*'                // 경로 중 제외할 폴더 및 폴더의 njk 파일(빌드 때 병합될 파일)
  ])
      .pipe(plumber({errorHandler: onErrorHandler}))      // 에러 발생 시 gulp 종료 방지 및 에러 핸들링
      .pipe(data(gnbDatafile))                               // _gnb.json 적용
      .pipe(data(docsDatafile))                             // _docs.json 적용
      .pipe(data(componentDatafile))                 // _components.json 적용
      .pipe(nunjucksRender({                              // njk 적용
        envOptions: {                                      // njk 옵션 설정
          autoescape: false,                               // njk 문법의 오류가 있더라도 진행
        },
        manageEnv: manageEnvironment,                      // 들여쓰기(Tab Indent) 함수 적용
        path: [path_src.html],                             // html 폴더 전체 경로
      }))
      .pipe(cached('html'))                              // 변경된 파일 캐시 저장
      .pipe(gulp.dest(path_dist.html))                   // 빌드 후 html 파일이 생성될 목적지 설정
}

// css task
const css = () => {
  //scss 옵션 정의
  const sass = gulpSass(dartSass);                        // ECMAScript 모듈(최신 Node.js 14 이상에서 지원됨)에서 사용하기 위해 선언
  const options = {
    scss: {
      outputStyle: "expanded",                            // 컴파일 스타일: nested(default), expanded, compact, compressed
      indentType: "space",                                // 들여쓰기 스타일: space(default), tabF
      indentWidth: 2,                                     // 들여쓰기 칸 수 (Default : 2)
      precision: 8,                                       // 컴파일 된 CSS 의 소수점 자리수 (Type : Integer , Default : 5)
      sourceComments: true,                               // 주석 제거 여부 (Default : false)
      compiler: dartSass,                                 // 컴파일 도구
    },
    postcss: [autoprefixer({
      overrideBrowserslist: 'last 2 versions',            // 최신 브라우저 기준 하위 2개의 버전까지 컴파일
    })]
  };

  return gulp.src(
      path_src.css + '/**/*.scss',                          // 컴파일 대상 scss파일 찾기
      {since: gulp.lastRun(css)}                          // 변경된 파일에 대해서만 컴파일 진행
  )
      .pipe(plumber({errorHandler: onErrorHandler}))         // 에러 발생 시 gulp종료 방지 및 에러 핸들링
      // *.css 생성
      .pipe(dependents())                                   // 현재 스트림에 있는 파일에 종속되는 모든 파일을 추가
      .pipe(sourcemaps.init())                              // 소스맵 작성
      .pipe(sass(options.scss).on('error', sass.logError))  // scss 옵션 적용 및 에러 발생 시 watch가 멈추지 않도록 logError 설정
      .pipe(postCss(options.postcss))                       // 하위 브라우저 고려
      .pipe(sourcemaps.write())                             // 소스맵 적용
      .pipe(gulp.dest(path_dist.css))                       // 컴파일 후 css파일이 생성될 목적지 설정
      // *.min.css 생성
      .pipe(minificss())                                    // 컴파일된 css 압축
      .pipe(rename({suffix: '.min'}))                     // 압축파일 *.min.css 생성
      .pipe(sourcemaps.write())                             // 소스맵 적용
      .pipe(gulp.dest(path_dist.css));                      // 컴파일 후 css파일이 생성될 목적지 설정
}

// js task
const coreJS = () => {
  return gulp.src([
      path_src.coreJS + '/*.js'
  ])
      .pipe(bro({                                                // 트렌스파일 시작
        transform: [
          babelify.configure({presets: ['@babel/preset-env']}), // ES6 이상의 문법을 일반 브라우저가 코드를 이해할 수 있도록 변환
          ['uglifyify', {global: true}]                       // 코드 최소화 및 난독화
        ]
      }))
      .pipe(gulp.dest(path_dist.coreJS));
}
const customJS = () => {
  return gulp.src([
      path_src.customJS + '/*.js'
  ])
      .pipe(gulp.dest(path_dist.customJS));
}


// image task 
// 이미지를 단순히 src에서 dist로 이동
const image = () => {
  return gulp.src(path_src.images + '/**/**/*')      // dist로 이동할 이미지 대상
      .pipe(gulp.dest(path_dist.images));              // 이동 목적지 설정
}

// 이미지 최적화 후 dist로 이동
const image_optimization = () => {
  return gulp.src(path_src.images + '/**/**/*')      // 최적화 이미지 대상
      .pipe(imagemin({verbose: true}))                // 이미지 최적화 ( 최적화 된 이미지의 정보 기록 옵션 적용 )
      .pipe(gulp.dest(path_dist.images));              // 최적화 후 생성될 목적지 설정
}

const video = () => {
  return gulp.src(path_src.video + '/**/**/*')      // dist로 이동할 이미지 대상
      .pipe(gulp.dest(path_dist.video));              // 이동 목적지 설정
}

const plugin = () => {
  return gulp.src(path_src.plugin + '/**/**/*')      // dist로 이동할 이미지 대상
      .pipe(gulp.dest(path_dist.plugin));              // 이동 목적지 설정

}

const json = () => {
  return gulp.src(path_src.json + '/**/**/*')      // dist로 이동할 이미지 대상
      .pipe(jsonMinify())
      .pipe(gulp.dest(path_dist.json));              // 이동 목적지 설정
}
const json2 = () => {
  return gulp.src(path_src.json + '/**/**/*')      // dist로 이동할 이미지 대상
      .pipe(gulp.dest(path_dist.json));              // 이동 목적지 설정
}

// clean task
const clean = () => del([dist]);                       // dist 폴더 삭제

// webserver task
const webserver = () => {
  return gulp.src(dist)                                // webserver를 실행 할 폴더 경로
      .pipe(
          ws({                                               // webserver 옵션 설정
            port: 8000,                                   // 기본 8000, 필요 시 변경 가능
            livereload: true,                                // 작업 중 파일 저장 시 브라우저 자동 새로고침 (기본 false)
            open: true                                       // Gulp 실행 시 자동으로 브라우저를 띄우고 localhost 서버 열기 (기본 false)
          })
      );
}

// watch task
const watch = () => {
  // njk watch
  const html_watcher = gulp.watch(path_src.html + "/**/*", html);
  file_management(html_watcher, path_src.html, path_dist.html);

  // sass watch 
  const scss_watcher = gulp.watch(path_src.css + "/**/*", css);
  file_management(scss_watcher, path_src.css, path_dist.css);

  // core JS watch
  const coreJS_watcher = gulp.watch(path_src.coreJS + "/**/*", coreJS);
  file_management(coreJS_watcher, path_src.coreJS, path_dist.coreJS);

  // custom JS watch
  const customJS_watcher = gulp.watch(path_src.customJS + "/**/*", customJS);
  file_management(customJS_watcher, path_src.customJS, path_dist.customJS);

  // img watch
  const image_watcher = gulp.watch(path_src.images + "/**/*", image);
  file_management(image_watcher, path_src.images, path_dist.images);

  //   video watch
  const video_watcher = gulp.watch(path_src.video + "/**/*", video);
  file_management(video_watcher, path_src.video, path_dist.video);

  //   plugins watch
  const plugin_watcher = gulp.watch(path_src.plugin + "/**/*", plugin);
  file_management(plugin_watcher, path_src.plugin, path_dist.plugin);

  //  json watch
  const json_watcher = gulp.watch(path_src.json + "/**/*", json);
  file_management(json_watcher, path_src.json, path_dist.json);
}

// watch - 파일 감시 및 삭제를 위한 함수 
const file_management = (watcher_target, src_path, dist_path) => {
  watcher_target.on('unlink', (filepath) => {
    const filePathFromSrc = path.relative(path.resolve(src_path), filepath);
    const extension_type = filePathFromSrc.split('.')[filePathFromSrc.split('.').length - 1];

    // scss 삭제 (min 파일까지 삭제)
    if (extension_type === 'scss') {
      const destFilePath_css = path.resolve(dist_path, filePathFromSrc).replace('.scss', '.css');
      del.sync(destFilePath_css);
      const destFilePath_minCss = path.resolve(dist_path, filePathFromSrc).replace('.scss', '.min.css');
      del.sync(destFilePath_minCss);
    }

    // js 삭제 (min 파일까지 삭제)
    else if (extension_type === 'js') {
      const destFilePath_js = path.resolve(dist_path, filePathFromSrc);
      del.sync(destFilePath_js);
      const destFilePath_minJs = path.resolve(dist_path, filePathFromSrc).replace('.js', '.min.js');
      del.sync(destFilePath_minJs);
    }

    // njk(html) 삭제
    else if (extension_type === 'njk') {
      const destFilePath_html = path.resolve(dist_path, filePathFromSrc).replace('.njk', '.html');
      del.sync(destFilePath_html);
    }

    // 위 파일 외 삭제
    else {
      const destFilePath = path.resolve(dist_path, filePathFromSrc);
      del.sync(destFilePath);
    }
  });
}

// series & parallel (task 그룹화) ----------------------------------

// 순차적으로 실행되어야 하는 task 그룹
const prepare = gulp.series([clean, image]);

// 위 prepare 실행 완료 후 순차적으로 실행되어야 하는 task 그룹
const devAssets = gulp.series([html, css, customJS, coreJS, video, plugin, json]);
const exportAssets = gulp.series([html, css,  customJS, coreJS, video, plugin, json]);

// 동시에 여러 개의 task가 실행되어야 하는 그룹 (병렬 실행)
const live = gulp.parallel([webserver, watch]);


// export (gulp 실행 명령어) ----------------------------------------

export const build = gulp.series([prepare, exportAssets]);

export const dev = gulp.series([prepare,devAssets, live]);

// gulp image_min 실행 (이미지 최적화 하나만을 위한 명령) 
export const image_min = gulp.series([image_optimization]);