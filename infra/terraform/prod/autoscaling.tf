# ECS Auto Scaling — Worker scales on Redis queue depth (aura:scanQueue)
# Custom CloudWatch metric published by worker via structured logs + metric filter

# ── App Auto Scaling Target ───────────────────────────────────────────────────

resource "aws_appautoscaling_target" "worker" {
  max_capacity       = var.worker_max_count
  min_capacity       = 0  # scale-to-zero when queue is empty
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# ── Scale Out — queue depth rising ───────────────────────────────────────────

resource "aws_appautoscaling_policy" "worker_scale_out" {
  name               = "${local.name_prefix}-worker-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 50
      scaling_adjustment          = 1
    }

    step_adjustment {
      metric_interval_lower_bound = 50
      scaling_adjustment          = 3
    }
  }
}

# ── Scale In — queue draining ─────────────────────────────────────────────────

resource "aws_appautoscaling_policy" "worker_scale_in" {
  name               = "${local.name_prefix}-worker-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300 # longer cooldown to avoid flapping
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

# ── CloudWatch Metric Filter — extract queue depth from worker logs ───────────
# Worker emits: {"event":"queue.depth","value":N} in structured JSON logs

resource "aws_cloudwatch_log_metric_filter" "queue_depth" {
  name           = "${local.name_prefix}-queue-depth"
  log_group_name = aws_cloudwatch_log_group.worker.name
  pattern        = "{ $.event = \"queue.depth\" }"

  metric_transformation {
    name          = "ScanQueueDepth"
    namespace     = "Aura/Worker"
    value         = "$.value"
    default_value = 0
    unit          = "Count"
  }
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "queue_high" {
  alarm_name          = "${local.name_prefix}-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ScanQueueDepth"
  namespace           = "Aura/Worker"
  period              = 60
  statistic           = "Maximum"
  threshold           = 50
  alarm_description   = "Redis scan queue depth > 50 — scale out workers"
  alarm_actions       = [aws_appautoscaling_policy.worker_scale_out.arn]

  # treat missing data as zero — prevents false alarms when worker is scaled to zero
  treat_missing_data = "notBreaching"

  tags = { Name = "${local.name_prefix}-alarm-queue-high" }
}

resource "aws_cloudwatch_metric_alarm" "queue_low" {
  alarm_name          = "${local.name_prefix}-queue-depth-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 5
  metric_name         = "ScanQueueDepth"
  namespace           = "Aura/Worker"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5
  alarm_description   = "Redis scan queue depth <= 5 — scale in workers"
  alarm_actions       = [aws_appautoscaling_policy.worker_scale_in.arn]

  treat_missing_data = "notBreaching"

  tags = { Name = "${local.name_prefix}-alarm-queue-low" }
}

# ── Worker Error Rate Alarm ───────────────────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "worker_errors" {
  name           = "${local.name_prefix}-worker-errors"
  log_group_name = aws_cloudwatch_log_group.worker.name
  pattern        = "{ $.event = \"analyze.failed\" }"

  metric_transformation {
    name          = "WorkerInferenceErrors"
    namespace     = "Aura/Worker"
    value         = "1"
    default_value = 0
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "worker_error_rate" {
  alarm_name          = "${local.name_prefix}-worker-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "WorkerInferenceErrors"
  namespace           = "Aura/Worker"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Worker inference errors > 5 in 5 min — investigate"

  tags = { Name = "${local.name_prefix}-alarm-worker-errors" }
}
