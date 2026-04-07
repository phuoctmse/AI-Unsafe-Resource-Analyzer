# internal_api_key 
resource "aws_secretsmanager_secret" "internal_api_key" {
  name                    = "${var.project}/internal-api-key"
  description             = "Shared secret between aura-backend and aura-worker"
  recovery_window_in_days = 7

  tags = { Name = "${local.name_prefix}-secret-internal-api-key" }
}

resource "aws_secretsmanager_secret_version" "internal_api_key" {
  secret_id     = aws_secretsmanager_secret.internal_api_key.id
  secret_string = var.internal_api_key
}

# db_password 
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project}/db-password"
  description             = "PostgreSQL master password for aura RDS instance"
  recovery_window_in_days = 7

  tags = { Name = "${local.name_prefix}-secret-db-password" }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# hf_token (optional)
resource "aws_secretsmanager_secret" "hf_token" {
  name                    = "${var.project}/hf-token"
  description             = "HuggingFace read token for CLIP model download"
  recovery_window_in_days = 7

  tags = { Name = "${local.name_prefix}-secret-hf-token" }
}

resource "aws_secretsmanager_secret_version" "hf_token" {
  secret_id     = aws_secretsmanager_secret.hf_token.id
  secret_string = var.hf_token
}

# ── redis_url ─────────────────────────────────────────────────────────────────
# Endpoint chỉ biết sau khi ElastiCache được tạo — Terraform tự resolve
resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${var.project}/redis-url"
  description             = "Redis connection URL for backend and worker (REDIS_URL)"
  recovery_window_in_days = 7

  tags = { Name = "${local.name_prefix}-secret-redis-url" }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
}
