import { Router } from 'express'
import userRouter from '../resources/users/routes'

const router: Router = Router()

router.use('/user', userRouter)

export default router
