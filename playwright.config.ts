import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',workers:1,fullyParallel:false,retries:0,timeout:60000,
 use:{reducedMotion:'reduce',baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',
  launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 reporter:[['list'],['html',{open:'never'}]],
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'phone',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm exec vite -- preview --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false},
});
