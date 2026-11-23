BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [organization_name] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [work_area_code] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [work_center_code] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [resource_code] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [resource_name] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[base_cumplimiento_egp] ALTER COLUMN [descripcion_producto] NVARCHAR(255) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
