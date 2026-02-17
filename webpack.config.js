const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

module.exports = (env = {}) => {
  const target = env.target || 'chrome';
  const mode = env.mode || 'production';
  const isDev = mode === 'development';

  // Merge manifests
  const baseManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/manifest/base.json'), 'utf8'));
  const targetManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, `src/manifest/${target}.json`), 'utf8'));
  const manifest = { ...baseManifest, ...targetManifest };

  // Merge arrays like host_permissions
  if (baseManifest.host_permissions && targetManifest.host_permissions) {
    manifest.host_permissions = [...baseManifest.host_permissions, ...targetManifest.host_permissions];
  }

  // Add localhost in dev mode
  if (isDev) {
    manifest.host_permissions = manifest.host_permissions || [];
    manifest.host_permissions.push('http://localhost:8080/*', 'http://localhost:8081/*');
  }

  return {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'inline-source-map' : 'source-map',

    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      popup: './src/popup/index.ts',
      dashboard: './src/dashboard/personal/index.ts',
      'team-dashboard': './src/dashboard/team/index.ts',
    },

    output: {
      path: path.resolve(__dirname, `dist/${target}`),
      filename: '[name].js',
      clean: true,
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.js'],
    },

    plugins: [
      {
        apply(compiler) {
          compiler.hooks.afterEmit.tap('ManifestPlugin', () => {
            const outDir = path.resolve(__dirname, `dist/${target}`);
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(
              path.join(outDir, 'manifest.json'),
              JSON.stringify(manifest, null, 2)
            );
          });
        },
      },
      new CopyPlugin({
        patterns: [
          { from: 'static/icons', to: 'icons' },
          { from: 'src/popup/popup.html', to: 'popup/popup.html' },
          { from: 'src/popup/popup.css', to: 'popup/popup.css' },
          { from: 'src/dashboard/personal/dashboard.html', to: 'dashboard/dashboard.html' },
          { from: 'src/dashboard/personal/dashboard.css', to: 'dashboard/dashboard.css' },
          { from: 'src/dashboard/team/team-dashboard.html', to: 'dashboard/team-dashboard.html' },
          { from: 'src/dashboard/team/team-dashboard.css', to: 'dashboard/team-dashboard.css' },
        ],
      }),
    ],

    optimization: {
      splitChunks: false,
    },
  };
};
