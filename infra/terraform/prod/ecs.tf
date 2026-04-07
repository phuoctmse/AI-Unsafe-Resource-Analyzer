# ECS Fargate — Cluster + Task Definitions + Services for all 3 containers

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${local.name_prefix}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ── VPC Endpoints ────────────────────────────────────────────────────────────
# S3 Gateway endpoint — FREE, không đi qua NAT, luôn nên bật
# Interface endpoints (ECR, Secrets Manager, Logs) bị bỏ vì cost $75/tháng
# vượt quá NAT savings ở traffic thấp — re-enable khi data transfer > 860 GB/tháng

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${local.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${local.name_prefix}-vpce-s3" }
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name_prefix}-frontend"
  retention_in_days = 30
  tags              = { Name = "${local.name_prefix}-logs-frontend" }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = 30
  tags              = { Name = "${local.name_prefix}-logs-backend" }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${local.name_prefix}-worker"
  retention_in_days = 30
  tags              = { Name = "${local.name_prefix}-logs-worker" }
}

# ── Task Definitions ──────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name_prefix}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = var.frontend_image
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "NEXT_PUBLIC_API_URL", value = "https://${local.api_fqdn}" },
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -fsS http://localhost:3000/ || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${local.name_prefix}-td-frontend" }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = var.backend_image
    essential = true

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "S3_BUCKET_NAME", value = var.images_bucket_name },
      { name = "S3_REGION", value = local.region },
      { name = "S3_PUBLIC_URL", value = "https://${var.images_bucket_name}.s3.${local.region}.amazonaws.com" },
      { name = "AWS_REGION", value = local.region },
      { name = "DASHBOARD_CORS_ORIGINS", value = "https://${local.app_fqdn}" },
    ]

    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = aws_secretsmanager_secret.db_url.arn
      },
      {
        name      = "INTERNAL_API_KEY"
        valueFrom = aws_secretsmanager_secret.internal_api_key.arn
      },
      {
        name      = "REDIS_URL"
        valueFrom = aws_secretsmanager_secret.redis_url.arn
      },
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -fsS http://localhost:3001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${local.name_prefix}-td-backend" }
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name_prefix}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "worker"
    image     = var.worker_image
    essential = true

    portMappings = [{
      containerPort = 8001
      protocol      = "tcp"
    }]

    environment = [
      { name = "USE_MOCK_INFERENCE", value = "false" },
      { name = "BACKEND_URL", value = "http://${local.api_fqdn}" },
      { name = "MAX_CONCURRENT_INFERENCE", value = "4" },
      { name = "INFERENCE_TIMEOUT_S", value = "120" },
      { name = "TORCH_NUM_THREADS", value = "4" },
      { name = "S3_BUCKET_NAME", value = var.images_bucket_name },
      { name = "AWS_REGION", value = local.region },
    ]

    secrets = [
      {
        name      = "INTERNAL_API_KEY"
        valueFrom = aws_secretsmanager_secret.internal_api_key.arn
      },
      {
        name      = "HF_TOKEN"
        valueFrom = aws_secretsmanager_secret.hf_token.arn
      },
      {
        name      = "REDIS_URL"
        valueFrom = aws_secretsmanager_secret.redis_url.arn
      },
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -fsS http://localhost:8001/health || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 120 # allow model loading time
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${local.name_prefix}-td-worker" }
}

# ── ECS Services ──────────────────────────────────────────────────────────────

resource "aws_ecs_service" "frontend" {
  name            = "${local.name_prefix}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = { Name = "${local.name_prefix}-svc-frontend" }
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = { Name = "${local.name_prefix}-svc-backend" }
}

resource "aws_ecs_service" "worker" {
  name            = "${local.name_prefix}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  # No launch_type — use capacity_provider_strategy for Spot

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4  # 80% Spot
    base              = 0
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1  # 20% On-demand fallback
    base              = 1  # always keep 1 on-demand task minimum
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  # No load_balancer block — worker is internal only, health checked via SG

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = { Name = "${local.name_prefix}-svc-worker" }
}
