{
  description = "house.kg Telegram notifications";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    yo-url-yo-json = {
      url = "github:Seryiza/yo-url-yo-json";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.camoufox.follows = "camoufox";
    };

    camoufox = {
      url = "github:Seryiza/camoufox";
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
          camoufoxPackage = inputs.camoufox.packages.${system}.camoufox;
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
                camoufoxPackage
              ];

            YO_URL_YO_JSON_BIN = "${yoUrlYoJson}/bin/yo-url-yo-json";
            YOYJ_CAMOUFOX_EXECUTABLE_PATH = "${camoufoxPackage}/bin/camoufox";
          };
        }
      );
    };
}
