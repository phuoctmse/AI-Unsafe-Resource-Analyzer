# RDS PostgreSQL 16 — primary persistence for aura-backend (Prisma)

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  # Backups — free tier chỉ cho phép 0 ngày retention
  backup_retention_period = 0
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  skip_final_snapshot = true  # free tier — không cần final snapshot

  # Availability
  multi_az            = false   # set true for production HA
  publicly_accessible = false

  # Monitoring — tắt enhanced monitoring để tiết kiệm ~$0.30/tháng
  # Bật lại khi cần debug production issues
  performance_insights_enabled = false
  monitoring_interval          = 0

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [password]
  }

  tags = { Name = "${local.name_prefix}-postgres" }
}

# Store full connection string in Secrets Manager for ECS injection
resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${var.project}/db-url"
  description             = "Full PostgreSQL connection string for Prisma (DATABASE_URL)"
  recovery_window_in_days = 7

  tags = { Name = "${local.name_prefix}-secret-db-url" }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}?schema=public"
}
