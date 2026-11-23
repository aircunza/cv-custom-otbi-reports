BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[base_cumplimiento_egp] (
    [id] INT NOT NULL IDENTITY(1,1),
    [negocio_pais] NVARCHAR(100),
    [organization_code] NVARCHAR(100) NOT NULL,
    [organization_name] NVARCHAR(100),
    [work_area_code] NVARCHAR(100),
    [work_center_code] NVARCHAR(100),
    [resource_code] NVARCHAR(100),
    [resource_name] NVARCHAR(100),
    [usage_rate] NVARCHAR(100),
    [grupo] NVARCHAR(100),
    [resource_class_code] NVARCHAR(100),
    [resource_quantity] NVARCHAR(100),
    [fecha] DATE NOT NULL,
    [standard_operation_code] NVARCHAR(100),
    [turno_reportado] NVARCHAR(100),
    [modelo] NVARCHAR(100),
    [codigo_producto] NVARCHAR(100),
    [descripcion_producto] NVARCHAR(100),
    [udm] NVARCHAR(100),
    [fmil] NVARCHAR(100),
    [und_rec_max] NVARCHAR(100),
    [hpok] NVARCHAR(100),
    [ton] NVARCHAR(100),
    [mil] NVARCHAR(100),
    [meta] NVARCHAR(100),
    [hpok_acum] NVARCHAR(100),
    [hprgdia] NVARCHAR(100),
    [hprgdia_acum] NVARCHAR(100),
    [hdia_acum] NVARCHAR(100),
    [cvj_inventario] NVARCHAR(100),
    [cvj_costos_pac] NVARCHAR(100),
    [cvj_corporativa] NVARCHAR(100),
    [und_prd] NVARCHAR(100),
    [fecha_consulta] DATETIMEOFFSET,
    CONSTRAINT [base_cumplimiento_egp_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [base_cumplimiento_egp_organization_code_fecha_idx] ON [dbo].[base_cumplimiento_egp]([organization_code], [fecha]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
