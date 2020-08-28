#!/usr/bin/env node
const { run } = require('./index');

run({ commitMsgFileName: process.argv[2] || process.env.GIT_PARAMS || process.env.HUSKY_GIT_PARAMS }).catch(() => {
  // console.error(err); // this should have already been displayed
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});
