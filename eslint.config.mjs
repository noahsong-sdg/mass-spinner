import tseslint from 'typescript-eslint';

export default tseslint.config(
 ...tseslint.configs.recommendedTypeChecked.map(config=>({...config,files:['src/**/*.ts']})),
 {files:['src/**/*.ts'],languageOptions:{parserOptions:{project:'./tsconfig.json',tsconfigRootDir:import.meta.dirname}},rules:{'@typescript-eslint/no-unused-vars':['error',{varsIgnorePattern:'^_',ignoreRestSiblings:true}]}},
);
