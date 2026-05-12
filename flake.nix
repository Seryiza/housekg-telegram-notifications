{
  description = "house.kg Telegram notifications";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    yo-url-yo-json = {
      url = "github:Seryiza/yo-url-yo-json";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.cloakbrowser.follows = "cloakbrowser";
    };

    cloakbrowser = {
      url = "github:Seryiza/CloakBrowser";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ nixpkgs, ... }:
    let
      lib = nixpkgs.lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          yoUrlYoJson = inputs.yo-url-yo-json.packages.${system}.yo-url-yo-json;
          cloakbrowserChromium = inputs.cloakbrowser.packages.${system}.cloakbrowserChromium;
        in
        {
          default = pkgs.mkShell {
            packages =
              (with pkgs; [
                bun
                git
                nodejs_22
              ])
              ++ [
                yoUrlYoJson
                cloakbrowserChromium
              ];

            YO_URL_YO_JSON_BIN = "${yoUrlYoJson}/bin/yo-url-yo-json";
            CLOAKBROWSER_BINARY_PATH = "${cloakbrowserChromium}/bin/cloakbrowser-chrome";

            shellHook = ''
              export CLOAKBROWSER_CACHE_DIR="$PWD/.yo-url-yo-json/cloakbrowser"
              mkdir -p "$CLOAKBROWSER_CACHE_DIR"
            '';
          };
        }
      );
    };
}
