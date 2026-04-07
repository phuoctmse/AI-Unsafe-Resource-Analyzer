# AWS Budgets — chỉ tạo budget, không có notification subscriber
# Xem cost trực tiếp trên AWS Console > Billing > Budgets
# Thêm budget_alert_email vào tfvars để bật email alerts

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = "150"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = var.budget_alert_email != "" ? [80, 100] : []
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}

# aws_ce_anomaly_monitor bị xóa — free tier có limit 1 monitor,
# account này đã đạt limit. Dùng AWS Console để xem anomalies thủ công.
