#!/usr/bin/env node
const process = require("process");
const fs = require("fs");
const fse = require("fs-extra");
const os = require("os");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

function getRootDir() {
  return path.join(os.homedir(), ".framework");
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
  return new Promise(res => {
    fse.ensureDirSync(target);
    const file = fs.createWriteStream(path.join(target, filename), {
      mode: 0o755
    });
    console.log("fetching: " + source);
    http.get(source, function(response) {
      response.pipe(file);
      res();
    });
  });
}

function spawnExec(execDir) {
  console.log("launching: " + path.join(execDir, "exec"));
  let stdout = execSync(path.join(execDir, "exec"));
  console.log(stdout.toString());
}

function readSdkNdkVersions() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  return packageJson.finley;
}

function fetchNdkAndSdk(versions) {
  return Promise.all([
    downloadFile(getUrl("sdk", versions.sdk), getSdkDir(versions.sdk), "exec"),
    downloadFile(getUrl("ndk", versions.ndk), getNdkDir(versions.ndk), "exec")
  ])
    .then(() => new Promise(res => setTimeout(res, 5000)))
    .then(() => console.log("Sdk and ndk fetched"));
}

function generatePackageJson(name) {
  return JSON.stringify(
    {
      name: name,
      version: "1.0.0",
      main: "index.js",
      license: "MIT",
      finley: {
        sdk: "1.0.0",
        ndk: "12"
      }
    },
    null,
    4
  );
}

function newProject(name) {
  console.log("Creating new project: " + name);
  fse.ensureDirSync(name);
  fs.writeFileSync(path.join(name, "package.json"), generatePackageJson(name));
  console.log("Project created!");
}

switch (process.argv[2]) {
  case "new":
    if (process.argv[3]) {
      newProject(process.argv[3]);
    } else {
      console.log("Please specify project name");
    }
    break;
  case "build":
    const versions = readSdkNdkVersions();
    fetchNdkAndSdk(versions).then(() => {
      spawnExec(getSdkDir(versions.sdk));
      spawnExec(getNdkDir(versions.ndk));
    });

    break;
  default:
    console.log("Available options: new, build");
    break;
}
