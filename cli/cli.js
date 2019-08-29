#!/usr/bin/env node
const process = require("process");
const fs = require("fs");
const fse = require("fs-extra");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

function getRootDir() {
  if (os.type() === "Darwin") {
    return path.join(os.homedir(), ".framework");
  } else {
    throw "to be supported: " + os.type();
  }
}

function getSdkDir(version) {
  return path.join(getRootDir(), "sdk", version);
}

function getNdkDir(version) {
  return path.join(getRootDir(), "ndk", version);
}

function getUrl(type, version) {
  let platform = "";
  if (os.type() === "Darwin") {
    platform = "darwin";
  } else {
    platform = "windows";
  }

  return (
    "http://fabulous-framework.s3-eu-west-1.amazonaws.com/" +
    type +
    "-" +
    platform +
    "-" +
    version
  );
}

function downloadFile(source, target, filename) {
  fse.ensureDirSync(target);
  const file = fs.createWriteStream(path.join(target, filename), {
    mode: 0o755
  });
  console.log("fetching: " + source);
  http.get(source, function(response) {
    response.pipe(file);
  });
}

function spawnExec(execDir) {
  const ls = spawn(path.join(execDir, "exec"));
  ls.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });
  ls.stderr.on("data", data => {
    console.error(`stderr: ${data}`);
  });
  ls.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
}

function readSdkNdkVersions() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  return packageJson["fabulous-framework"];
}

function fetchNdkAndSdk(versions) {
  downloadFile(getUrl("sdk", versions.sdk), getSdkDir(versions.sdk), "exec");
  downloadFile(getUrl("ndk", versions.ndk), getNdkDir(versions.ndk), "exec");

  console.log("Sdk and ndk fetched");
}

switch (process.argv[2]) {
  case "build":
    const versions = readSdkNdkVersions();
    fetchNdkAndSdk(versions);

    spawnExec(getSdkDir(versions.sdk));
    spawnExec(getNdkDir(versions.ndk));
    break;
  default:
    console.log("Available options: build");
    break;
}
