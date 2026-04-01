variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Project name — used as prefix for all resource names"
  type        = string
  default     = "aura"
}

variable "domain_name" {
  description = "Root domain managed in Route 53 (e.g. example.com)"
  type        = string
}


variable "ecr_image_retention_count" {
  description = "Number of tagged images to keep per ECR repository"
  type        = number
  default     = 10
}

# VPC 

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to deploy into (minimum 2 for HA)"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

# RDS

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "aura"
}

variable "db_username" {
  type      = string
  default   = "aura"
  sensitive = true
}

variable "db_password" {
  description = "PostgreSQL master password — pass via TF_VAR_db_password env var, never hardcode"
  type        = string
  sensitive   = true
}

# ElastiCache

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

# S3 

variable "images_bucket_name" {
  description = "S3 bucket for user-uploaded images (must be globally unique)"
  type        = string
}

# Secrets

variable "internal_api_key" {
  description = "Shared secret between backend and worker — pass via TF_VAR_internal_api_key"
  type        = string
  sensitive   = true
}

variable "hf_token" {
  description = "HuggingFace read token for model downloads (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

# ECS

variable "backend_image" {
  description = "Full ECR image URI for aura-backend — injected by CD pipeline"
  type        = string
}

variable "frontend_image" {
  description = "Full ECR image URI for aura-frontend — injected by CD pipeline"
  type        = string
}

variable "worker_image" {
  description = "Full ECR image URI for aura-worker — injected by CD pipeline"
  type        = string
}

variable "worker_desired_count" {
  description = "Desired number of worker ECS tasks"
  type        = number
  default     = 2
}

variable "worker_max_count" {
  description = "Maximum worker tasks for auto-scaling"
  type        = number
  default     = 10
}
