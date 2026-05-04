export default {
  source: ["src/tokens.json"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "yza",
      buildPath: "dist/css/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables"
        }
      ]
    },
    json: {
      transformGroup: "js",
      buildPath: "dist/json/",
      files: [
        {
          destination: "tokens.json",
          format: "json/nested"
        }
      ]
    }
  }
};
