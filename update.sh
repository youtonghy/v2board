#!/bin/bash

if [ ! -d ".git" ]; then
  echo "Please deploy using Git."
  exit 1
fi

if ! command -v git &> /dev/null; then
    echo "Git is not installed! Please install git and try again."
    exit 1
fi

git config --global --add safe.directory $(pwd)
git fetch --all && git reset --hard origin/master && git pull origin master
rm -rf composer.lock composer.phar
wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar
php composer.phar update -vvv

php_main_version=$(php -v | head -n 1 | cut -d ' ' -f 2 | cut -d '.' -f 1)
if [ $php_main_version -ge 8 ]; then
    php composer.phar require joanhey/adapterman
    if ! php -m | grep -q "pcntl"; then
        echo "Adding pcntl extension to cli-php.ini"
        sed -i '/extension=redis.so/a extension=pcntl.so' cli-php.ini
    fi
    php -c cli-php.ini webman.php stop
    echo "Webman stopped.Please restart it by yourself."
fi

php artisan v2board:update

dotenv_get() {
  local key="$1"
  local value=""
  if [ -f ".env" ]; then
    value=$(awk -v key="$key" '$0 ~ "^" key "=" {sub("^" key "=", ""); print; exit}' .env)
  fi
  value="${value%$'\r'}"
  if [[ "$value" == \"*\" ]]; then value="${value#\"}"; value="${value%\"}"; fi
  if [[ "$value" == \'*\' ]]; then value="${value#\'}"; value="${value%\'}"; fi
  echo "$value"
}

apply_totp_schema_patch() {
  if [ ! -f ".env" ]; then
    echo "Skip TOTP schema patch: .env not found"
    return 0
  fi

  local db_connection
  db_connection=$(dotenv_get DB_CONNECTION)
  if [ "$db_connection" != "mysql" ]; then
    echo "Skip TOTP schema patch: DB_CONNECTION=$db_connection"
    return 0
  fi

  if ! command -v mysql &> /dev/null; then
    echo "Skip TOTP schema patch: mysql client not found"
    return 0
  fi

  local db_host db_port db_name db_user db_pass
  db_host=$(dotenv_get DB_HOST)
  db_port=$(dotenv_get DB_PORT)
  db_name=$(dotenv_get DB_DATABASE)
  db_user=$(dotenv_get DB_USERNAME)
  db_pass=$(dotenv_get DB_PASSWORD)

  if [ -z "$db_name" ] || [ -z "$db_user" ]; then
    echo "Skip TOTP schema patch: DB_DATABASE/DB_USERNAME missing in .env"
    return 0
  fi

  local -a mysql_base
  mysql_base=(mysql --batch --skip-column-names)
  if [ -n "$db_host" ]; then mysql_base+=(-h"$db_host"); fi
  if [ -n "$db_port" ]; then mysql_base+=(-P"$db_port"); fi
  mysql_base+=(-u"$db_user" "$db_name")

  local -a mysql_env
  mysql_env=()
  if [ -n "$db_pass" ]; then mysql_env=(MYSQL_PWD="$db_pass"); fi

  if ! "${mysql_env[@]}" "${mysql_base[@]}" -e "SELECT 1" >/dev/null 2>&1; then
    echo "Skip TOTP schema patch: unable to connect to MySQL"
    return 0
  fi

  local table_exists
  table_exists=$("${mysql_env[@]}" "${mysql_base[@]}" -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='v2_user';" 2>/dev/null | tr -d '[:space:]')
  if [ "$table_exists" != "1" ]; then
    echo "Skip TOTP schema patch: table v2_user not found"
    return 0
  fi

  ensure_column() {
    local column_name="$1"
    local ddl="$2"
    local exists
    exists=$("${mysql_env[@]}" "${mysql_base[@]}" -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='v2_user' AND COLUMN_NAME='${column_name}';" 2>/dev/null | tr -d '[:space:]')
    if [ "$exists" = "0" ]; then
      echo "Applying schema patch: add v2_user.${column_name}"
      "${mysql_env[@]}" "${mysql_base[@]}" -e "$ddl" >/dev/null
    fi
  }

  ensure_column "two_factor_type" "ALTER TABLE \`v2_user\` ADD COLUMN \`two_factor_type\` varchar(255) NULL DEFAULT NULL;"
  ensure_column "two_factor_verified" "ALTER TABLE \`v2_user\` ADD COLUMN \`two_factor_verified\` tinyint(1) NOT NULL DEFAULT 0;"
  ensure_column "totp_secret" "ALTER TABLE \`v2_user\` ADD COLUMN \`totp_secret\` varchar(255) NULL DEFAULT NULL;"
}

apply_totp_schema_patch

if [ -f "/etc/init.d/bt" ]; then
  chown -R www $(pwd);
fi
