# Application Load Balancer — internet-facing entry point
# Routes: / → frontend (:3000), /api/* + /socket.io/* → backend (:3001)

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true

  tags = { Name = "${local.name_prefix}-alb" }
}

# ── Target Groups ─────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "frontend" {
  name        = "${local.name_prefix}-tg-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Fargate requires ip target type

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = { Name = "${local.name_prefix}-tg-frontend" }
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-tg-backend"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  # Stickiness required for Socket.io WebSocket sessions
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = { Name = "${local.name_prefix}-tg-backend" }
}

# ── Listeners ─────────────────────────────────────────────────────────────────

# HTTP :80 → redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS :443 → default forward to frontend
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Route /api/* → backend
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Route /socket.io/* → backend (WebSocket upgrade)
resource "aws_lb_listener_rule" "socketio" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
