use anchor_lang::prelude::*;

declare_id!("ReplaceWithCrisprProgramID");

#[program]
pub mod crispr_protocol {
    use super::*;

    pub fn execute(ctx: Context<Execute>, steps: Vec<String>) -> Result<()> {
        require!(steps.len() <= 50, ProtocolError::TooManySteps);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
}

#[error_code]
pub enum ProtocolError {
    #[msg("Too many steps in protocol.")]
    TooManySteps,
} 