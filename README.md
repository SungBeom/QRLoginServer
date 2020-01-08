# LoginServerBP
QR login server with nodejs

## Requirement
- macOS v10.15.2
- nodejs v12.14.0
- yarn v1.21.1

## Installation
```
1. Clone a repository
2. Execute a shell command in the root directory(which contains package.json)
3. Install dependencies
      $yarn   or   $yarn install
4. Install sequelize-cli globally to make sequelize easier to use
      $yarn global add sequelize-cli
```

## Sequelize-cli usage
```
1. Make config/config.json
      $sequeilze init
2. Update DB information in config.json
3. Generates a model and its migration
      $generate --name "tableName" --attribute "columnName:dataType", ...
4-1. Run pending migrations
      $sequelize db:migrate
4-2. Reverts a migration
      $sequelize db:migrate:undo
5. Generates a new seed file
      $sequelize seed:generate --name "dataName"
6-1. Run specified seeder
      $sequelize db:seed --seed "seedName"
6-2. Deletes data from the database
      $sequelize db:seed:undo
```
