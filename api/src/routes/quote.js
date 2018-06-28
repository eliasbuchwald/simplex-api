import createLogger from 'logging'
import {
    getQuote
} from '../simplex'
import Validator from '../validator'
import uuidv4 from 'uuid/v4'
import response from '../response'
import {
    simplex
} from '../config'
import {
    Order
} from '../mangodb'

const logger = createLogger('quote.js')

let schema = {
    digital_currency: {
        type: String,
        required: true,
        enum: simplex.validDigital,
        message: "digital_currency required"
    },
    fiat_currency: {
        type: String,
        required: true,
        enum: simplex.validFiat,
        message: "fiat_currency required"
    },
    requested_currency: {
        type: String,
        required: true,
        enum: simplex.validDigital.concat(simplex.validFiat),
        message: "requested_currency required"
    },
    requested_amount: {
        type: Number,
        required: true,
        message: "requested_amount required and must be a number"
    }
}
let validator = Validator(schema)
export default (app) => {
    app.post('/quote', (req, res) => {
        let errors = validator.validate(req.body)
        if (errors.length) {
            logger.error(errors)
            response.error(res, errors.map(_err => _err.message))
        } else {
            let newUserId = uuidv4()
            let reqObj = Object.assign(req.body, {
                "end_user_id": newUserId,
                "wallet_id": simplex.walletID,
                "client_ip": '141.145.165.137'
            })
            getQuote(reqObj).then((result) => {
                Order({
                    user_id: newUserId,
                    quote_id: result.quote_id,
                    fiat_total_amount: {
                        currency: result.fiat_money.currency,
                        amount: result.fiat_money.total_amount
                    },
                    requested_digital_amount: {
                        currency: result.digital_money.currency,
                        amount: result.digital_money.amount
                    },
                    status: simplex.status.initiated
                }).save().catch((err) => {
                    logger.error(err)
                    response.error(res,error)
                })
                response.success(res, result)
            }).catch((error) => {
                logger.error(error)
                response.error(res, error)
            })
        }
    })
}