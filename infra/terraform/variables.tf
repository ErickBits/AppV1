variable "aws_region" {
  description = "Región AWS. us-east-1 suele ser la más barata."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombres y tags de todos los recursos."
  type        = string
  default     = "biblioteca"
}

# ---------- Red ----------
variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "ssh_cidr" {
  description = "CIDR con acceso SSH (22). GitHub Actions despliega por SSH, así que por defecto queda abierto; la autenticación es solo por llave."
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_public_key_path" {
  description = "Llave pública que se instala en la EC2 (ubuntu@)."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

# ---------- Cómputo (K3s) ----------
variable "instance_type" {
  description = "t3.medium (2 vCPU / 4 GiB) ≈ $0.042/h. t3.small (2 GiB) ahorra ~50% pero queda justo de memoria."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_gb" {
  description = "Disco gp3 raíz: imágenes de contenedor + PVC de Redis (local-path)."
  type        = number
  default     = 30
}

variable "k3s_version" {
  description = "Versión de K3s (vacío = canal stable)."
  type        = string
  default     = ""
}

# ---------- Base de datos ----------
variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_engine_version" {
  description = "Versión mayor de PostgreSQL (RDS elige el minor más reciente)."
  type        = string
  default     = "17"
}

variable "db_allocated_storage" {
  description = "GB de gp3. 20 es el mínimo de RDS."
  type        = number
  default     = 20
}

variable "db_name" {
  type    = string
  default = "biblioteca"
}

variable "db_username" {
  type    = string
  default = "biblioteca"
}

# ---------- Control de costos ----------
variable "budget_limit_usd" {
  description = "Límite mensual del AWS Budget (alertas a 50/80/100% real y 100% pronosticado)."
  type        = number
  default     = 150
}

variable "budget_alert_email" {
  description = "Correo que recibe las alertas del presupuesto."
  type        = string
}
