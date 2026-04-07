# Root module outputs — used by CI/CD pipelines and post-deploy verification

output "alb_dns_name" {
  description = "ALB DNS name — use for health checks before DNS propagates"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Frontend URL"
  value       = "https://${local.app_fqdn}"
}

output "api_url" {
  description = "Backend API URL"
  value       = "https://${local.api_fqdn}"
}

output "ecr_urls" {
  description = "ECR image URIs per service — reference in CD pipeline"
  value = {
    for k, repo in aws_ecr_repository.services :
    k => repo.repository_url
  }
}

output "ecs_cluster_name" {
  description = "ECS cluster name — used in aws ecs commands"
  value       = aws_ecs_cluster.main.name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = "${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}"
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_url_secret_arn" {
  description = "Secrets Manager ARN for REDIS_URL"
  value       = aws_secretsmanager_secret.redis_url.arn
}

output "db_url_secret_arn" {
  description = "Secrets Manager ARN for DATABASE_URL — inject into ECS or Prisma migrate"
  value       = aws_secretsmanager_secret.db_url.arn
}

output "images_bucket_name" {
  description = "S3 bucket name for uploaded images"
  value       = aws_s3_bucket.images.bucket
}
