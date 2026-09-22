import test from "node:test";
import assert from "node:assert/strict";
import { generateReadme, normalizeLines, parseRepoInput, sanitizeUrl, scoreReadme, slugFileName } from "../generator.js";

test("parses common GitHub repository input", () => {
  assert.deepEqual(parseRepoInput("https://github.com/openai/openai.git"), { owner:"openai", repo:"openai" });
  assert.deepEqual(parseRepoInput("openai/openai"), { owner:"openai", repo:"openai" });
});

test("rejects malformed repository input", () => {
  assert.equal(parseRepoInput("not a repo"), null);
});

test("accepts only http and https links", () => {
  assert.match(sanitizeUrl("https://example.com"), /^https:\/\/example\.com/);
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
});

test("normalizes comma and newline lists", () => {
  assert.deepEqual(normalizeLines("One, Two\nThree"), ["One", "Two", "Three"]);
});

test("generates expected README content", () => {
  const md = generateReadme({
    name:"Nebula",
    description:"Fast project",
    longDescription:"A longer explanation.",
    features:"Fast\nSimple",
    installation:"npm install",
    usage:"npm start",
    license:"MIT",
    repository:"openai/openai",
    badges:true,
    sectionOrder:["about","features","installation","usage","license"],
    enabledSections:{}
  });
  assert.match(md, /^# Nebula/m);
  assert.match(md, /## Features/);
  assert.match(md, /npm install/);
  assert.match(md, /img\.shields\.io\/github\/stars\/openai\/openai/);
});

test("file names are safe", () => {
  assert.equal(slugFileName("My / Project"), "My-Project.md");
});

test("score reaches 100 with all important fields", () => {
  const result = scoreReadme({
    name:"a", description:"b", longDescription:"c", features:"d", installation:"e",
    usage:"f", license:"MIT", repository:"x/y", tech:"JS", author:"me"
  });
  assert.equal(result.score, 100);
  assert.equal(result.missing.length, 0);
});
