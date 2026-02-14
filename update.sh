#!/bin/bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./update.sh [--no-git] [--skip-migrate]

Options:
  --no-git        Skip git fetch/reset (useful for local dev testing)
  --skip-migrate  Skip `php artisan migrate --force`
  -h, --help      Show this help

Environment:
  SKIP_GIT_SYNC=1 Same as --no-git
  SKIP_MIGRATE=1  Same as --skip-migrate
  COMPOSER_UPDATE=1  Run `composer update` instead of `composer install`
  COMPOSER_NO_DEV=0  Include dev dependencies
EOF
}

skip_git_sync="${SKIP_GIT_SYNC:-0}"
skip_migrate="${SKIP_MIGRATE:-0}"
while [ "${1:-}" != "" ]; do
  case "$1" in
    --no-git)
      skip_git_sync=1
      shift
      ;;
    --skip-migrate)
      skip_migrate=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [ ! -f "artisan" ]; then
  echo "artisan not found. Please run this script from the project root."
  exit 1
fi

if [ "$skip_git_sync" != "1" ] && [ ! -d ".git" ]; then
  echo "Please deploy using Git, or run with --no-git / SKIP_GIT_SYNC=1."
  exit 1
fi

if ! command -v git &> /dev/null; then
  if [ "$skip_git_sync" = "1" ]; then
    true
  else
    echo "Git is not installed! Please install git and try again."
    exit 1
  fi
fi

if [ "$skip_git_sync" != "1" ]; then
  git config --global --add safe.directory "$(pwd)"
  git fetch --all --prune
  git reset --hard origin/master
fi

log_step() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

totp_is_enabled() {
  if [ ! -f "config/v2board.php" ]; then
    return 1
  fi
  if ! command -v php &>/dev/null; then
    return 1
  fi
  local enabled
  enabled="$(php -r '$config=require "config/v2board.php"; echo $config["totp_enable"] ?? "";' 2>/dev/null || true)"
  case "$enabled" in
    1|"1"|"true"|"TRUE") return 0 ;;
    *) return 1 ;;
  esac
}

run_step() {
  local label="$1"
  shift
  local start_ts=$SECONDS
  log_step "${label}..."
  "$@"
  log_step "${label} done ($((SECONDS - start_ts))s)"
}

ensure_php_class_package() {
  local fqcn="$1"
  local package="$2"
  local constraint="${3:-}"
  local package_file="${4:-}"

  local should_require=0
  if [ -n "$package_file" ] && [ ! -f "$package_file" ]; then
    should_require=1
  fi

  if [ "$should_require" = "0" ]; then
    if php -r "require 'vendor/autoload.php'; exit(class_exists('${fqcn}') ? 0 : 1);" >/dev/null 2>&1; then
      return 0
    fi
    should_require=1
  fi

  local require_target="$package"
  if [ -n "$constraint" ]; then
    require_target="${package}:${constraint}"
  fi

  local require_args=(require "$require_target" --no-interaction --no-progress --with-all-dependencies)
  if [ "${composer_no_dev:-1}" = "1" ]; then
    require_args+=(--update-no-dev)
  fi
  run_step "Composer require ${package}" "${composer_cmd[@]}" "${require_args[@]}"
}

composer_cmd=()
if command -v composer &>/dev/null; then
  composer_cmd=(composer)
else
  if [ ! -f "composer.phar" ]; then
    log_step "composer not found, downloading composer.phar..."
    wget https://github.com/composer/composer/releases/latest/download/composer.phar -O composer.phar
  fi
  composer_cmd=(php composer.phar)
fi

# Default: use lockfile install to avoid high CPU from dependency resolution.
# Set COMPOSER_UPDATE=1 to force `composer update`.
composer_no_dev="${COMPOSER_NO_DEV:-1}"
composer_update="${COMPOSER_UPDATE:-0}"
composer_args=()
if [ "$composer_update" = "1" ]; then
  composer_args=(update)
else
  composer_args=(install)
fi
composer_args+=(--no-interaction --prefer-dist --no-progress --optimize-autoloader)
if [ "$composer_no_dev" = "1" ]; then
  composer_args+=(--no-dev)
fi
run_step "Composer ${composer_args[0]}" "${composer_cmd[@]}" "${composer_args[@]}"
ensure_php_class_package "lbuchs\\WebAuthn\\WebAuthn" "lbuchs/webauthn" "^2.2" "vendor/lbuchs/webauthn/src/WebAuthn.php"

if [ "$skip_migrate" != "1" ]; then
  run_step "php artisan migrate --force" php artisan migrate --force
else
  log_step "Skip php artisan migrate --force"
fi

php_main_version=$(php -v | head -n 1 | cut -d ' ' -f 2 | cut -d '.' -f 1)
if [ $php_main_version -ge 8 ]; then
    if [ ! -f "composer.lock" ] || ! grep -q "\"name\": \"joanhey/adapterman\"" composer.lock 2>/dev/null; then
        run_step "Composer require joanhey/adapterman" "${composer_cmd[@]}" require joanhey/adapterman --no-interaction --no-progress
    fi
    if ! php -m | grep -q "pcntl"; then
        echo "Adding pcntl extension to cli-php.ini"
        sed -i '/extension=redis.so/a extension=pcntl.so' cli-php.ini
    fi
    php -c cli-php.ini webman.php stop
    echo "Webman stopped.Please restart it by yourself."
fi

run_step "php artisan v2board:update" php artisan v2board:update

# If multiple Horizon masters are running, each will spawn workers and can amplify CPU spikes after restart.
if command -v ps &>/dev/null; then
  horizon_masters="$(ps -eo args | awk '$0 ~ /php .*artisan horizon$/ {c++} END {print c+0}')"
  if [ "${horizon_masters:-0}" -gt 1 ]; then
    log_step "Warning: detected ${horizon_masters} Horizon master processes. Ensure only one is managed by supervisor/pm2."
    log_step "Tip: you can cap workers via HORIZON_MAX_PROCESSES/HORIZON_MIN_PROCESSES/HORIZON_NICE in .env."
  fi
fi

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
  if totp_is_enabled; then
    echo "Skip TOTP schema patch: totp already enabled"
    return 0
  fi

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

# Ensure cache/log directories are writable after updates to avoid config cache failures.
if id -u www >/dev/null 2>&1; then
  chgrp -R www bootstrap/cache storage || true
  chmod -R 775 bootstrap/cache storage || true
fi
