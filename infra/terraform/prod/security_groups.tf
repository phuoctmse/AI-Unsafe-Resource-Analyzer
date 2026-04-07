# ALB Security Group 
# Accepts HTTPS from internet, forwards to ECS tasks

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB: accept HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-alb-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS from internet"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_ecs_frontend" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  description                  = "Forward to frontend ECS task"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_ecs_backend" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  description                  = "Forward to backend ECS task"
}

# ECS Security Group 
# Accepts traffic from ALB, connects to RDS and Redis

resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs-sg"
  description = "ECS tasks: accept from ALB, connect to RDS and Redis"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-ecs-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb_frontend" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  description                  = "Frontend port from ALB"
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb_backend" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  description                  = "Backend port from ALB"
}

# Worker health check — internal only, not exposed via ALB
resource "aws_vpc_security_group_ingress_rule" "ecs_worker_health" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 8001
  to_port                      = 8001
  ip_protocol                  = "tcp"
  description                  = "Worker health check within ECS SG"
}

resource "aws_vpc_security_group_egress_rule" "ecs_to_rds" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.rds.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL"
}

resource "aws_vpc_security_group_egress_rule" "ecs_to_redis" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.redis.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Redis"
}

# ECS needs outbound HTTPS to pull ECR images and call HuggingFace
resource "aws_vpc_security_group_egress_rule" "ecs_https_out" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Pull ECR images and external HTTPS"
}

# RDS Security Group 

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "RDS PostgreSQL: accept from ECS only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-rds-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from ECS"
}

# Redis Security Group

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "ElastiCache Redis: accept from ECS only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-redis-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_ecs" {
  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Redis from ECS"
}
