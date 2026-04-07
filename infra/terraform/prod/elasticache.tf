# ElastiCache Redis 7 — message broker for aura:scanQueue

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-redis-subnet-group" }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis for aura scan queue and session state"

  node_type            = var.redis_node_type
  engine_version       = "7.1"
  port                 = 6379
  parameter_group_name = "default.redis7"

  # Single shard, 1 primary — scale to multi-AZ when needed
  num_cache_clusters         = 1
  automatic_failover_enabled = false

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true  # đã tạo với TLS — giữ nguyên, dùng rediss:// trong URL

  # Persistence — AOF for durability (matches docker-compose AOF config)
  snapshot_retention_limit = 1
  snapshot_window          = "05:00-06:00"

  apply_immediately = true  # required khi thay đổi transit_encryption_enabled

  tags = { Name = "${local.name_prefix}-redis" }
}
